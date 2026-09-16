require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const https = require('https');
const crypto = require('crypto');
const os = require('os');
const { execFile, spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
// webhook 路由必须拿到【原始请求体】做签名校验，因此全局 JSON 解析排除 /api/webhooks/*
app.use(express.json({ limit: '1mb', type: (req) => req.headers['content-type'] === 'application/json' && !req.path.startsWith('/api/webhooks/') }));
// 二进制音频体（ASR）：15mb，仅匹配 audio/* 与 octet-stream；Buffer 必须原样透传给 /api/asr
app.use(express.raw({ type: ['audio/*', 'application/octet-stream'], limit: '15mb' }));

// ============ 安全防护（零原生依赖：安全头 / 原型污染清洗 / 分档限流 / 登录防爆破） ============
// 1) 安全响应头
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(self), camera=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.removeHeader('X-Powered-By');
  next();
});
// 2) 原型污染深度清洗：递归剔除 __proto__ / constructor / prototype 危险键
function sanitizeBody(v, depth) {
  if (depth > 6) return null;
  if (Buffer.isBuffer(v)) return v;            // 二进制音频体原样保留，绝不能当普通对象清洗
  if (Array.isArray(v)) return v.map(x => sanitizeBody(x, depth + 1));
  if (v && typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      o[k] = sanitizeBody(v[k], depth + 1);
    }
    return o;
  }
  return v;
}
app.use((req, res, next) => { if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) req.body = sanitizeBody(req.body, 0); next(); });
// 3) 滑动窗口内存限流（按 IP，分档复用）
const rateBuckets = {};
function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
}
function rateLimit(max, windowMs, name) {
  return function (req, res, next) {
    const key = name + ':' + clientIp(req), now = Date.now();
    let b = rateBuckets[key];
    if (!b || now - b.reset > windowMs) b = rateBuckets[key] = { n: 0, reset: now };
    b.n++;
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - b.n));
    if (b.n > max) { res.set('Retry-After', Math.ceil((b.reset + windowMs - now) / 1000)); return res.status(429).json({ error: 'too_many_requests' }); }
    next();
  };
}
// 全局宽松兜底：防整体刷量（每 IP 每分钟 300 次静态/普通请求）
app.use(rateLimit(300, 60000, 'global'));
// 成本接口较严限流复用器
const authLimiter = rateLimit(12, 60000, 'auth');     // 注册/登录
const costLimiter = rateLimit(60, 60000, 'cost');     // chat/tts/asr 等花钱接口
const orderLimiter = rateLimit(20, 60000, 'order');   // 下单/开通
setInterval(() => { const now = Date.now(); for (const k of Object.keys(rateBuckets)) if (now - rateBuckets[k].reset > 600000) delete rateBuckets[k]; }, 600000).unref();
// 4) 登录失败计数 + 渐进延迟（防爆破）
const loginFail = {};
function failDelay(email) {
  const f = loginFail[email] || { n: 0 };
  f.n++; loginFail[email] = f;
  return Math.min(2000, 100 * Math.pow(2, Math.min(f.n, 5))); // 100→200→400…上限2s
}
function resetFail(email) { delete loginFail[email]; }
// 枚举白名单
const LANG_CN = {
  zh: '中文', en: '英语', ja: '日语', ko: '韩语', es: '西班牙语', pt: '葡萄牙语',
  id: '印尼语', th: '泰语', fr: '法语', de: '德语', ru: '俄语', ar: '阿拉伯语',
  vi: '越南语', it: '意大利语', tr: '土耳其语', hi: '印地语', ms: '马来语', fil: '菲律宾语（塔加洛语）'
};
const LANG_SELF = {
  en: 'English', zh: '中文', ja: '日本語', ko: '한국어', es: 'Español', pt: 'Português',
  id: 'Bahasa Indonesia', th: 'ไทย', fr: 'Français', de: 'Deutsch', ru: 'Русский',
  ar: 'العربية', vi: 'Tiếng Việt', it: 'Italiano', tr: 'Türkçe', hi: 'हिन्दी',
  ms: 'Bahasa Melayu', fil: 'Filipino'
};
const NATIVE_LANGS = Object.keys(LANG_CN);
const TARGET_LANGS = ['zh', 'en'];
const CHARACTERS = ['female', 'male'];
const TEACHERS = ['f_3d', 'f_real', 'f_anime', 'f_illus', 'm_3d', 'm_real', 'm_anime', 'm_illus'];
function langCn(code) { return LANG_CN[code] || '英语'; }
function asEnum(v, allow, dft) { return allow.indexOf(v) >= 0 ? v : dft; }
function cleanStr(v, max) { const s = String(v == null ? '' : v); return s.length > max ? s.slice(0, max) : s; }

app.use(express.static(path.join(__dirname, 'public')));

// ============ 数据存储 ============
const DATA_FILE = path.join(__dirname, 'data.json');
function loadData() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return { users: {} }; }
}
function saveData(data) { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }

// ============ 账号/订阅/兑换码 数据库（JSON 持久化，零原生依赖） ============
const DB_FILE = path.join(__dirname, 'db.json');
function loadDB() {
  try {
    const d = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    d.users = d.users || {}; d.tokens = d.tokens || {}; d.codes = d.codes || {}; d.orders = d.orders || [];
    return d;
  } catch { return { users: {}, tokens: {}, codes: {}, orders: [] }; }
}
let db = loadDB();
// 清理历史脏订单：未支付(pending)与本地联调(mock)单不进后台；只保留真实支付/兑换成功记录
(function cleanOrders() {
  const before = db.orders.length;
  db.orders = db.orders.filter(o => o.status === 'paid' && o.channel !== 'mock');
  if (db.orders.length !== before) saveDB();
})();
function saveDB() { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }

// 密码哈希（node 内置 scrypt，无需 bcrypt 原生编译）
function hashPassword(password, salt) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return { salt, hash };
}
function verifyPassword(password, salt, hash) {
  const test = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(test, 'hex'), Buffer.from(hash, 'hex'));
}

const ADMIN_KEY = process.env.ADMIN_KEY || 'admin888';   // 管理后台密钥（.env 可改）
const TRIAL_DAYS = 3;                                     // 新注册免费试用天数
// ============ 积分制（核心商业模式）============
// 1 积分 ≈ 1 分钟对话（4 轮 × 15 秒）。充值档位：$9.9→50 / $19.9→120 / $39.9→400。
// 消耗：对话/跟读 0.25 积分/轮；做题/重听 0.05 积分/次。积分永久有效，扣完即停。
const CREDIT_PACKS = {
  pack50:  { usd: 9.9,  credits: 100, label: 'Starter · 100 credits (~7 min)', planId: process.env.WHOP_PLAN_PACK50 || 'plan_TFoFTKnYJPwGm', route: 'starter-30-ai-chat-credits' },
  pack120: { usd: 19.9, credits: 350, label: 'Pro · 350 credits (~25 min)', planId: process.env.WHOP_PLAN_PACK120 || 'plan_Eu9nwvaNWstX2', route: 'pro-100-ai-chat-credits' },
  pack400: { usd: 39.9, credits: 900, label: 'VIP · 900 credits (~1 hr)', planId: process.env.WHOP_PLAN_PACK400 || 'plan_RbQK6PxPqYzJp', route: 'vip-250-ai-chat-credits' },
};
const CHAT_COST = 0.25;   // 对话一轮 / 跟读打分
const QUIZ_COST = 0.05;   // 做题 / 重听
const MIN_CREDITS = CHAT_COST; // 低于此值禁止对话
// 兼容旧订阅字段（老数据不删），新逻辑全部走 credits
const PLAN_DAYS = { week: 7, month: 30 };
// 支付网关接入前的"本地直开/模拟支付"仅用于联调：生产环境(NODE_ENV=production)默认关闭，防止登录即免费开通；
// 生产环境必须显式设置 ALLOW_LOCAL_GRANT=true 才允许 mock/direct 免费开通（默认关）
const ALLOW_LOCAL_GRANT = process.env.ALLOW_LOCAL_GRANT === 'true';

// 订阅状态机：试用 + 正式订阅取较晚到期时间，用时现算，到期自动失效
function subscriptionOf(u) {
  const now = Date.now();
  const trialUntil = u.trialUntil || 0;
  const expireAt = u.expireAt || 0;
  const until = Math.max(trialUntil, expireAt);
  const active = now < until;
  let plan = 'none';
  if (expireAt > now) plan = u.plan || 'paid';
  else if (trialUntil > now) plan = 'trial';
  const daysLeft = active ? Math.ceil((until - now) / 86400000) : 0;
  return { active, until, expireAt, trialUntil, plan, daysLeft };
}
// 开通/续费：在当前到期时间基础上叠加，不浪费剩余时长
function grantPlan(u, type) {
  const days = PLAN_DAYS[type] || 0;
  if (!days) return false;
  const base = Math.max(Date.now(), u.expireAt || 0);
  u.expireAt = base + days * 86400000;
  u.plan = type;
  return true;
}
function publicUser(u) {
  return {
    id: u.id, email: u.email, createdAt: u.createdAt,
    nativeLang: u.nativeLang, targetLang: u.targetLang, character: u.character,
    teacherId: u.teacherId || (u.character === 'male' ? 'm_real' : 'f_real'),
    credits: Math.round((u.credits || 0) * 100) / 100,
    subscription: subscriptionOf(u),
    progress: progressBrief(u)
  };
}
// 惰性补齐老用户的历史/进度/长记忆字段（不写盘，保存时统一落库）
function ensureState(u) {
  if (!u) return u;
  if (typeof u.credits !== 'number') u.credits = 0;  // 积分制：余额
  if (!Array.isArray(u.messages)) u.messages = [];           // 完整可回看对话（带双语/时间/模式）
  if (!Array.isArray(u.history)) u.history = [];            // 自由聊天喂模型的精简上下文
  if (!u.courseHistories || typeof u.courseHistories !== 'object') u.courseHistories = {}; // 每门课独立上下文
  if (!u.progress || typeof u.progress !== 'object') u.progress = { xp: 0, completed: {}, streakDays: 0, lastStudyDate: null, chatCount: 0, words: 0 };
  if (!u.progress.completed) u.progress.completed = {};
  if (!u.memory || typeof u.memory !== 'object') u.memory = { summary: '', turns: 0, updatedAt: null }; // 长期记忆
  return u;
}
function progressBrief(u) {
  const p = (u && u.progress) || {};
  return {
    xp: p.xp || 0,
    streakDays: p.streakDays || 0,
    completedCount: Object.keys(p.completed || {}).length,
    chatCount: p.chatCount || 0,
    words: p.words || 0,
    lastStudyDate: p.lastStudyDate || null
  };
}
// 连续学习天数：按 UTC 自然日比较，跨 1 天 +1，同一天不重复，断签重置为 1
function bumpStreak(p) {
  const today = new Date().toISOString().slice(0, 10);
  if (p.lastStudyDate === today) return;
  if (p.lastStudyDate) {
    const diff = Math.round((Date.parse(today) - Date.parse(p.lastStudyDate)) / 86400000);
    p.streakDays = (diff === 1) ? (p.streakDays || 0) + 1 : 1;
  } else {
    p.streakDays = 1;
  }
  p.lastStudyDate = today;
}
// 从请求解析当前登录用户（支持 Authorization: Bearer 或 query.token，供 Audio 标签用）
function authUser(req) {
  let token = req.headers['authorization'] || '';
  token = token.replace(/^Bearer\s+/i, '');
  if (!token && req.query && req.query.token) token = String(req.query.token);
  if (!token && req.body && req.body.token) token = req.body.token;
  const email = db.tokens[token];
  if (!email) return null;
  return ensureState(db.users[email] || null);
}
// 登录且积分足够才放行，用于消耗成本的接口
function requireActive(req, res) {
  const u = authUser(req);
  if (!u) { res.status(401).json({ error: 'not_logged_in' }); return null; }
  if ((u.credits || 0) < MIN_CREDITS) {
    res.status(402).json({ error: 'insufficient_credits', credits: u.credits || 0, need: MIN_CREDITS });
    return null;
  }
  return u;
}

// ============ 8大品类42门课程 ============
const CATEGORIES = [
  {
    id: 'beginner',
    name: '零基础入门',
    icon: '🌱',
    desc: '完全不会中文？从这里开始！HSK1级水平',
    featured: true,
    courses: [
      { id: 'b1', name: '你好吗（打招呼）', scene: '第一次见面打招呼', vocab: ['你好','你好吗','我很好','谢谢','不客气','再见'], goal: '学会最基本的问候' },
      { id: 'b2', name: '我叫什么（自我介绍）', scene: '介绍自己名字和国籍', vocab: ['我叫','我是','哪国人','认识你','很高兴','名字'], goal: '自我介绍' },
      { id: 'b3', name: '象形字入门（日月山水）', scene: '看图认汉字，象形字很有趣', vocab: ['日','月','山','水','火','人'], goal: '认识6个象形字' },
      { id: 'b4', name: '四声调（妈麻马骂）', scene: '练习四个声调', vocab: ['妈','麻','马','骂','第一声','第四声'], goal: '掌握四声调' },
      { id: 'b5', name: '多少钱（数字购物）', scene: '问价格买东西', vocab: ['多少钱','贵','便宜','这个','那个','给我'], goal: '问价格' },
      { id: 'b6', name: '在哪里（问路）', scene: '问地方在哪', vocab: ['在哪里','厕所','火车站','往前走','左转','右边'], goal: '问路' },
      { id: 'b7', name: '我要吃饭（点餐）', scene: '餐厅点菜', vocab: ['菜单','这个','好吃','辣','喝水','买单'], goal: '点餐' },
      { id: 'b8', name: '简单时间（几点了）', scene: '问时间', vocab: ['几点','现在','今天','明天','星期','点钟'], goal: '问时间' },
      { id: 'b9', name: '聊天气', scene: '和朋友聊今天天气', vocab: ['天气','晴天','下雨','热','冷','刮风'], goal: '聊天气' },
      { id: 'b10', name: '我的家（家庭成员）', scene: '介绍家人', vocab: ['爸爸','妈妈','哥哥','姐姐','孩子','家'], goal: '介绍家庭' },
      { id: 'b11', name: '我喜欢什么（爱好）', scene: '聊喜欢和不喜欢', vocab: ['喜欢','不喜欢','吃','喝','看电影','音乐'], goal: '表达喜好' },
      { id: 'b12', name: '打电话（约时间）', scene: '打电话约见面', vocab: ['喂','什么时候','有空','见面','OK','好'], goal: '约时间' },
    ]
  },
  {
    id: 'seasia',
    name: '东南亚求职中文',
    icon: '💼',
    desc: '东南亚五国18-35岁求职青年，中资企业上岗速成',
    courses: [
      { id: 'seasia1', name: '中资工厂上岗速成', scene: '流水线车间，工人和班长对话', vocab: ['流水线', '质检', '包装', '仓储', '合格', '次品'], goal: '学会车间指令和质检术语' },
      { id: 'seasia2', name: '跨境电商职场', scene: '虾皮/Lazada客服和运营', vocab: ['订单', '发货', '退货', '好评', '客服', '库存'], goal: '学会电商客服话术' },
      { id: 'seasia3', name: '外贸跟单', scene: '和客户谈报价对账', vocab: ['报价', '询盘', '对账', '发货', '合同', '定金'], goal: '学会外贸跟单流程' },
      { id: 'seasia4', name: '面试专项', scene: '中资公司面试', vocab: ['自我介绍', '工作经验', '为什么选我们', '薪资期望', '加班', '入职'], goal: '通过中文面试' },
      { id: 'seasia5', name: '行政前台', scene: '前台接待和考勤', vocab: ['考勤', '会议', '接待', '报表', '请假', '访客'], goal: '学会前台工作用语' },
      { id: 'seasia6', name: '物流货代', scene: '清关物流对接', vocab: ['清关', '拖车', '集装箱', '报关', '运费', '到港'], goal: '学会物流术语' },
    ]
  },
  {
    id: 'infra',
    name: '海外基建工业',
    icon: '🏗️',
    desc: '非洲/中东/中亚工地工厂，B端高价课',
    courses: [
      { id: 'infra1', name: '工地安全指令', scene: '工地安全教育', vocab: ['安全帽', '高空作业', '危险', '安全带', '停工', '事故'], goal: '掌握安全指令' },
      { id: 'infra2', name: '建材工程术语', scene: '建材验收', vocab: ['水泥', '钢材', '管道', '混凝土', '测量', '钢筋'], goal: '掌握建材术语' },
      { id: 'infra3', name: '矿产行业', scene: '采矿现场', vocab: ['采矿', '分拣', '设备', '巡检', '矿石', '传送带'], goal: '矿产专用术语' },
      { id: 'infra4', name: '电力光伏', scene: '设备调试巡检', vocab: ['电压', '故障', '维修', '光伏板', '停电', '发电'], goal: '电力术语' },
      { id: 'infra5', name: '工厂设备操作', scene: '机器操作和故障上报', vocab: ['开机', '关机', '故障', '保养', '维修单', '报警'], goal: '设备操作用语' },
      { id: 'infra6', name: '工程汇报', scene: '项目开会', vocab: ['进度', '延期', '问题', '对接', '验收', '工期'], goal: '项目汇报用语' },
    ]
  },
  {
    id: 'kids',
    name: '华裔少儿中文',
    icon: '🧒',
    desc: '4-15岁华裔儿童，母语保留+考级',
    courses: [
      { id: 'kids1', name: '幼儿启蒙4-6岁', scene: '看图说话', vocab: ['爸爸', '妈妈', '苹果', '狗狗', '红色', '吃饭'], goal: '基础听说' },
      { id: 'kids2', name: '拼音纠错', scene: '拼音练习', vocab: ['b', 'p', 'm', 'f', 'd', 't'], goal: '拼音发音矫正' },
      { id: 'kids3', name: 'YCT考级', scene: 'YCT考试模拟', vocab: ['考试', '题目', '答案', '听力', '阅读', '分数'], goal: 'YCT1-4通关' },
      { id: 'kids4', name: '绘本情景', scene: '读绘本对话', vocab: ['故事', '图画', '主角', '勇敢', '朋友', '快乐'], goal: '绘本理解' },
      { id: 'kids5', name: '汉字识字', scene: '学写汉字', vocab: ['人', '口', '手', '日', '月', '山'], goal: '认识100个汉字' },
      { id: 'kids6', name: '传统文化', scene: '节日故事', vocab: ['春节', '中秋', '饺子', '月亮', '红包', '团圆'], goal: '了解传统节日' },
    ]
  },
  {
    id: 'hsk',
    name: 'HSK考试',
    icon: '📝',
    desc: '全球流量最大，留学移民求职刚需',
    courses: [
      { id: 'hsk1', name: 'HSK1-2入门', scene: '零基础日常对话', vocab: ['你好', '谢谢', '对不起', '没关系', '多少钱', '在哪里'], goal: 'HSK1-2通关' },
      { id: 'hsk2', name: 'HSK3-4进阶', scene: '日常交际', vocab: ['喜欢', '觉得', '应该', '已经', '正在', '比较'], goal: 'HSK3-4' },
      { id: 'hsk3', name: 'HSK5-6高阶', scene: '学术讨论', vocab: ['观点', '分析', '证明', '现象', '影响', '趋势'], goal: 'HSK5-6' },
      { id: 'hsk4', name: '口语纠音', scene: '发音练习', vocab: ['声调', '声母', '韵母', '语调', '连读', '重音'], goal: '发音标准' },
      { id: 'hsk5', name: '阅读技巧', scene: '阅读刷题', vocab: ['关键词', '主旨', '推理', '细节', '排除法', '时间分配'], goal: '阅读高分' },
      { id: 'hsk6', name: '写作模板', scene: '作文练习', vocab: ['开头', '论点', '论据', '结尾', '连接词', '字数'], goal: '写作速成' },
    ]
  },
  {
    id: 'life',
    name: '在华生活',
    icon: '🏠',
    desc: '来华留学生/外籍员工/家属',
    courses: [
      { id: 'life1', name: '衣食住行', scene: '日常买菜做饭', vocab: ['菜市场', '便宜', '新鲜', '多少钱一斤', '找零', '塑料袋'], goal: '独立生活' },
      { id: 'life2', name: '医院就医', scene: '去医院看病', vocab: ['挂号', '发烧', '咳嗽', '吃药', '发烧', '门诊'], goal: '看病沟通' },
      { id: 'life3', name: '银行政务', scene: '办银行卡', vocab: ['开户', '身份证', '密码', '转账', '取款', '排队'], goal: '银行业务' },
      { id: 'life4', name: '交通出行', scene: '打车坐高铁', vocab: ['打车', '高铁', '身份证', '安检', '检票', '到站'], goal: '独立出行' },
      { id: 'life5', name: '租房生活', scene: '和房东对话', vocab: ['房租', '押金', '水电', '合同', '搬家', '物业'], goal: '租房沟通' },
      { id: 'life6', name: '购物砍价', scene: '商场购物', vocab: ['打折', '试一下', '有没有折扣', '包邮', '退货', '尺寸'], goal: '购物用语' },
    ]
  },
  {
    id: 'biz',
    name: '高端商务职场',
    icon: '💎',
    desc: '外企高管/跨境老板，高客单价',
    courses: [
      { id: 'biz1', name: '商务会议', scene: '开会发言', vocab: ['议程', '结论', '汇报', '决议', '跟进', '纪要'], goal: '会议表达' },
      { id: 'biz2', name: '商务谈判', scene: '价格谈判', vocab: ['报价', '让步', '底线', '成交', '合同', '尾款'], goal: '谈判博弈' },
      { id: 'biz3', name: '商务邮件', scene: '写邮件', vocab: ['主题', '附件', '此致', '敬礼', '期待回复', '抄送'], goal: '邮件写作' },
      { id: 'biz4', name: '客户接待', scene: '宴请客户', vocab: ['欢迎', '干杯', '请客', '买单', '招待', '用车'], goal: '接待礼仪' },
      { id: 'biz5', name: '职场汇报', scene: '述职报告', vocab: ['业绩', 'KPI', '复盘', '目标', '完成率', '规划'], goal: '述职表达' },
    ]
  },
  {
    id: 'travel',
    name: '文旅留学',
    icon: '✈️',
    desc: '旅游/留学/校园生活',
    courses: [
      { id: 'travel1', name: '旅游导游', scene: '跟导游游览', vocab: ['景点', '门票', '拍照', '集合', '讲解', '自由活动'], goal: '旅游沟通' },
      { id: 'travel2', name: '校园生活', scene: '大学课堂', vocab: ['选课', '学分', '教授', '论文', '考试', '社团'], goal: '校园用语' },
      { id: 'travel3', name: '学术课堂', scene: '听课问答', vocab: ['提问', '笔记', '小组讨论', '截止日期', 'PPT', '提问'], goal: '学术表达' },
      { id: 'travel4', name: '风俗礼仪', scene: '社交场合', vocab: ['红包', '敬酒', '请客', '座次', '送礼', '道谢'], goal: '社交礼仪' },
    ]
  },
  {
    id: 'special',
    name: '特种行业',
    icon: '🔧',
    desc: '小众高薪差异化课程',
    courses: [
      { id: 'special1', name: '餐饮后厨', scene: '餐厅后厨', vocab: ['菜单', '出菜', '备料', '口味', '辣', '咸'], goal: '餐饮用语' },
      { id: 'special2', name: '酒店前台', scene: '前台接待', vocab: ['入住', '退房', '房卡', '押金', '早餐', 'wifi'], goal: '酒店用语' },
      { id: 'special3', name: '港口物流', scene: '码头操作', vocab: ['货轮', '吊装', '集装箱', '理货', '靠岸', '卸货'], goal: '港口术语' },
      { id: 'special4', name: '新能源', scene: '新能源工厂', vocab: ['电池', '充电', '光伏', '储能', '检测', '安全'], goal: '新能源术语' },
      { id: 'special5', name: '跨境直播', scene: '直播带货', vocab: ['上架', '链接', '下单', '秒杀', '粉丝', '评论'], goal: '直播话术' },
    ]
  },
];

// ============ TTS (火山引擎自然人声) ============
const VOLC_TTS_KEY = '0c859faf-caff-448f-a444-aa54d7cb573b';

app.get('/api/tts', costLimiter, async (req, res) => {
  const _u = requireActive(req, res);
  if (!_u) return;
  const text = cleanStr(req.query.text, 200);
  const char = asEnum(req.query.char, CHARACTERS, 'female');
  const lang = asEnum(req.query.lang, NATIVE_LANGS.concat(['ja']), 'zh');
  if (!text) return res.status(400).json({ error: 'no text' });

  // 自然人声音色：中文男=深夜博客男（低沉慵懒、夜晚陪伴、骚柔自然）；英文男=低语温柔男（低沉温柔）；
  // 日语男回退中文深夜博客；其余语种男声回退多语种 David，避免新音色硬读小语种失败。
  const F = { zh: 'zh_female_gaolengyujie_uranus_bigtts', en: 'en_female_natasha_uranus_bigtts', ja: 'ja_female_bv024_uranus_bigtts' };
  const M = { zh: 'zh_male_shenyeboke_uranus_bigtts', en: 'en_male_diyuwenrounan_uranus_bigtts', ja: 'zh_male_shenyeboke_uranus_bigtts' };
  const M_FALLBACK = 'en_male_david_uranus_bigtts';
  const speaker = char === 'male' ? (M[lang] || M_FALLBACK) : (F[lang] || F.en);

  const body = JSON.stringify({
    req_params: {
      text: text,
      speaker: speaker,
      audio_params: { format: 'mp3', sample_rate: 24000 }
    }
  });

  const https = require('https');
  const volcReq = https.request({
    hostname: 'openspeech.bytedance.com',
    path: '/api/v3/tts/unidirectional',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': VOLC_TTS_KEY,
      'X-Api-Resource-Id': 'seed-tts-2.0'
    }
  }, (volcRes) => {
    const chunks = [];
    volcRes.on('data', (c) => chunks.push(c));
    volcRes.on('end', () => {
      const buf = Buffer.concat(chunks);
      // 火山TTS返回多个JSON chunk拼接，需要逐个解析拼接base64音频
      let allBase64 = '';
      try {
        // 尝试找所有JSON对象
        const text = buf.toString();
        // 用正则找所有 {"code":0,...,"data":"..."} 
        const regex = /"data":"([^"]+)"/g;
        let m;
        while ((m = regex.exec(text)) !== null) {
          allBase64 += m[1];
        }
        if (allBase64.length > 100) {
          const audioBuf = Buffer.from(allBase64, 'base64');
          res.set('Content-Type', 'audio/mpeg');
          return res.send(audioBuf);
        }
        // 单个JSON
        const j = JSON.parse(text);
        if (j.data) {
          const audioBuf = Buffer.from(j.data, 'base64');
          res.set('Content-Type', 'audio/mpeg');
          return res.send(audioBuf);
        }
        console.error('Volc TTS no data:', text.substring(0, 200));
      } catch(e) {
        console.error('Volc TTS parse error:', e.message);
      }
      // Fallback有道
      const voiceType = char === 'male' ? 2 : 1;
      const youdaoUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&type=${voiceType}`;
      https.get(youdaoUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (ydRes) => {
        const ydChunks = [];
        ydRes.on('data', (c) => ydChunks.push(c));
        ydRes.on('end', () => {
          res.set('Content-Type', 'audio/mpeg');
          res.send(Buffer.concat(ydChunks));
        });
      });
    });
  });
  volcReq.write(body);
  volcReq.end();
});

// ============ API: 账号 注册/登录/状态 ============
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

app.post('/api/auth/register', authLimiter, (req, res) => {
  if (typeof req.body.email !== 'string') return res.status(400).json({ error: 'invalid_email' });
  const email = cleanStr(req.body.email, 120).trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'invalid_email' });
  if (password.length < 6 || password.length > 200) return res.status(400).json({ error: 'password_short' });
  if (db.users[email]) return res.status(409).json({ error: 'email_exists' });
  const { salt, hash } = hashPassword(password);
  const now = Date.now();
  const u = {
    id: 'u' + now.toString(36) + crypto.randomBytes(3).toString('hex'),
    email, salt, hash: hash,
    createdAt: new Date(now).toISOString(),
    nativeLang: asEnum(req.body.nativeLang, NATIVE_LANGS, 'en'),
    targetLang: asEnum(req.body.targetLang, TARGET_LANGS, 'zh'),
    character: asEnum(req.body.character, CHARACTERS, 'female'),
    teacherId: asEnum(req.body.teacherId, TEACHERS, 'f_real'),
    trialUntil: 0, expireAt: 0, plan: 'none',
    history: [], messages: [], courseHistories: {},
    progress: { xp: 0, completed: {}, streakDays: 0, lastStudyDate: null, chatCount: 0, words: 0 },
    memory: { summary: '', turns: 0, updatedAt: null }   // 不送免费试用；每用户独立历史/进度/长记忆
  };
  db.users[email] = u;
  const token = crypto.randomBytes(24).toString('hex');
  db.tokens[token] = email;
  saveDB();
  res.json({ token, user: publicUser(u) });
});

app.post('/api/auth/login', authLimiter, (req, res) => {
  if (typeof req.body.email !== 'string') return res.status(400).json({ error: 'invalid_email' });
  const email = cleanStr(req.body.email, 120).trim().toLowerCase();
  const password = String(req.body.password || '');
  const u = db.users[email];
  let ok = false;
  if (u) { try { ok = verifyPassword(password, u.salt, u.hash); } catch (e) { ok = false; } }
  if (!u || !ok) {
    const delay = u ? failDelay(email) : 300; // 账号不存在也给固定延迟，减轻账号枚举
    return setTimeout(() => res.status(u ? 401 : 404).json({ error: u ? 'wrong_password' : 'account_notfound' }), delay);
  }
  resetFail(email);
  const token = crypto.randomBytes(24).toString('hex');
  db.tokens[token] = email;
  saveDB();
  res.json({ token, user: publicUser(u) });
});

app.get('/api/auth/me', (req, res) => {
  const u = authUser(req);
  if (!u) return res.status(401).json({ error: 'not_logged_in' });
  res.json({ user: publicUser(u) });
});

app.post('/api/auth/logout', (req, res) => {
  let token = req.headers['authorization'] || '';
  token = token.replace(/^Bearer\s+/i, '');
  if (token && db.tokens[token]) { delete db.tokens[token]; saveDB(); }
  res.json({ ok: true });
});

// 保存用户偏好（母语/目标语/角色）——枚举白名单，拒绝任意值
app.post('/api/user/profile', (req, res) => {
  const u = authUser(req);
  if (!u) return res.status(401).json({ error: 'not_logged_in' });
  if (req.body.nativeLang !== undefined) u.nativeLang = asEnum(req.body.nativeLang, NATIVE_LANGS, u.nativeLang || 'en');
  if (req.body.targetLang !== undefined) u.targetLang = asEnum(req.body.targetLang, TARGET_LANGS, u.targetLang || 'zh');
  if (req.body.character !== undefined) u.character = asEnum(req.body.character, CHARACTERS, u.character || 'female');
  if (req.body.teacherId !== undefined) u.teacherId = asEnum(req.body.teacherId, TEACHERS, u.teacherId || 'f_real');
  saveDB();
  res.json({ user: publicUser(u) });
});

// ============ API: 兑换码核销（积分包兑换码，过期用户也要能兑换，故只要求登录） ============
app.post('/api/redeem', orderLimiter, (req, res) => {
  const u = authUser(req);
  if (!u) return res.status(401).json({ error: 'not_logged_in' });
  const code = String(req.body.code || '').trim().toUpperCase().replace(/\s+/g, '');
  const c = db.codes[code];
  if (!c) return res.status(404).json({ error: 'code_invalid' });
  if (c.used) return res.status(409).json({ error: 'code_used' });
  // 兑换码值 c.type 即积分包 id（pack50/120/400），或直接是积分数
  const pack = CREDIT_PACKS[c.type];
  const grantCredits = pack ? pack.credits : (Number(c.type) || 0);
  if (!grantCredits) return res.status(400).json({ error: 'bad_code_type' });
  u.credits = Math.round(((u.credits || 0) + grantCredits) * 100) / 100;
  c.used = true; c.usedBy = u.email; c.usedAt = new Date().toISOString();
  db.orders.push({ id: 'o' + Date.now(), email: u.email, plan: c.type, channel: 'redeem', amount: 0, currency: 'CODE', status: 'paid', credits: grantCredits, code, createdAt: new Date().toISOString(), paidAt: new Date().toISOString() });
  saveDB();
  res.json({ ok: true, credits: grantCredits, balance: u.credits, user: publicUser(u) });
});

// ============ API: 积分包（Whop/NOWPayments 支付，回调唯一开通） ============
app.get('/api/plans', (req, res) => res.json({ packs: CREDIT_PACKS, costs: { chat: CHAT_COST, quiz: QUIZ_COST } }));

// 创建订单：只生成订单号和金额返回，【不落库】。只有真正支付成功（回调）才入库。
app.post('/api/order/create', (req, res) => {
  const u = authUser(req);
  if (!u) return res.status(401).json({ error: 'not_logged_in' });
  const packId = String(req.body.pack || req.body.plan || '');
  const pack = CREDIT_PACKS[packId];
  if (!pack) return res.status(400).json({ error: 'bad_pack' });
  const order = {
    id: 'ord' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex'),
    email: u.email, pack: packId, credits: pack.credits,
    amount: pack.usd, currency: 'USD',
    status: 'pending', createdAt: new Date().toISOString(), paidAt: null
  };
  res.json({ order, checkoutUrl: null, note: 'payment_pending' });
});

// 支付成功后的统一加积分+落库（Whop webhook / NOWPayments IPN / mock 都走这里）。幂等：同一订单号只处理一次。
function fulfillOrder(email, packId, orderId, meta) {
  const u = db.users[email];
  if (!u) return false;
  orderId = orderId || ('p' + Date.now());
  if (db.orders.some(o => o.id === orderId && o.status === 'paid')) return true; // 已处理，幂等
  const pack = CREDIT_PACKS[packId];
  const grantCredits = pack ? pack.credits : (Number(meta && meta.credits) || 0);
  if (!grantCredits) return false;
  u.credits = Math.round(((u.credits || 0) + grantCredits) * 100) / 100;
  db.orders = db.orders.filter(o => o.id !== orderId);
  db.orders.push({
    id: orderId, email, pack: packId, credits: grantCredits,
    channel: (meta && meta.channel) || 'paid',
    amount: (meta && typeof meta.amount === 'number') ? meta.amount : 0,
    currency: (meta && meta.currency) || 'USD',
    status: 'paid',
    createdAt: new Date().toISOString(), paidAt: new Date().toISOString()
  });
  saveDB();
  return true;
}
// 本地模拟支付成功（仅联调；生产关）
app.post('/api/order/mock-pay', (req, res) => {
  if (!ALLOW_LOCAL_GRANT) return res.status(402).json({ error: 'payment_gateway_required' });
  const u = authUser(req);
  if (!u) return res.status(401).json({ error: 'not_logged_in' });
  const packId = String(req.body.pack || req.body.plan || '');
  if (!CREDIT_PACKS[packId]) return res.status(400).json({ error: 'bad_pack' });
  const orderId = String(req.body.orderId || ('mock' + Date.now()));
  if (db.orders.some(o => o.id === orderId && o.status === 'paid')) {
    return res.json({ ok: true, duplicate: true, user: publicUser(u) });
  }
  fulfillOrder(u.email, packId, orderId, { channel: 'mock', amount: 0, currency: 'TEST' });
  res.json({ ok: true, user: publicUser(u) });
});

// 本地直开（生产关）
app.post('/api/order/direct', orderLimiter, (req, res) => {
  if (!ALLOW_LOCAL_GRANT) return res.status(402).json({ error: 'payment_gateway_required' });
  const u = authUser(req);
  if (!u) return res.status(401).json({ error: 'not_logged_in' });
  const packId = String(req.body.pack || req.body.plan || '');
  const pack = CREDIT_PACKS[packId];
  if (!pack) return res.status(400).json({ error: 'bad_pack' });
  const rawReq = cleanStr(req.body.reqId, 80).replace(/[^\w-]/g, '');
  const orderId = rawReq ? ('direct-' + rawReq) : ('direct' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex'));
  if (db.orders.some(o => o.id === orderId && o.status === 'paid')) {
    return res.json({ ok: true, duplicate: true, user: publicUser(u) });
  }
  fulfillOrder(u.email, packId, orderId, { channel: 'direct', amount: pack.usd, currency: 'USD' });
  res.json({ ok: true, orderId, user: publicUser(u) });
});

// ==================== 支付网关：Whop（订阅）+ NOWPayments（加密货币） ====================
// 设计原则（按官方文档严格实现）：
//  1) 唯一开通依据是【验签通过的 webhook/IPN 回调】，前端跳转成功页绝不直接开通。
//  2) 回调必须用【原始请求体】验签；时间戳防重放（Whop 5 分钟窗）；webhook-id/payment_id 幂等去重。
//  3) 订阅周期由支付平台管理：续费→再推回调→我们叠加 7/30 天；取消/到期/退款→停权。
const PAY = {
  whopKey: process.env.WHOP_API_KEY || '',
  whopSecret: process.env.WHOP_WEBHOOK_SECRET || '',
  whopAccount: process.env.WHOP_ACCOUNT_ID || '',
  whopProductWeek: process.env.WHOP_PRODUCT_WEEK || '',
  whopProductMonth: process.env.WHOP_PRODUCT_MONTH || '',
  whopSandbox: false,
  nowpayKey: process.env.NOWPAYMENTS_API_KEY || '',
  nowpayIpn: process.env.NOWPAYMENTS_IPN_SECRET || '',
  nowpaySandbox: (process.env.NOWPAYMENTS_SANDBOX || 'true') !== 'false',
};
if (!db.processedEvents) db.processedEvents = {};
// 深度排序对象（NOWPayments IPN 验签要求）
function sortObjDeep(o) {
  if (Array.isArray(o)) return o.map(sortObjDeep);
  if (o && typeof o === 'object') {
    return Object.keys(o).sort().reduce((a, k) => { a[k] = sortObjDeep(o[k]); return a; }, {});
  }
  return o;
}
function findOrderById(id) { return db.orders.find(o => o.id === id); }
// 按 Whop membership id 反查用户（开通时写入 user.whopMembers）
function userByWhopMember(memId) {
  if (!memId) return null;
  for (const email in db.users) if (db.users[email].whopMember === memId) return db.users[email];
  return null;
}
function revokeAccess(email, reason) {
  const u = db.users[email]; if (!u) return;
  u.expireAt = Date.now(); u.plan = 'none';
  u.subStatus = 'revoked'; u.revokeReason = reason || 'expired';
  saveDB();
}

// ---- Whop webhook（原始 body，HMAC-SHA256 over id.timestamp.body）----
app.post('/api/webhooks/whop', express.raw({ type: '*/*', limit: '1mb' }), (req, res) => {
  const rawStr = (req.body || Buffer.alloc(0)).toString('utf8');
  const wid = String(req.headers['webhook-id'] || '');
  const ts = String(req.headers['webhook-timestamp'] || '');
  const sigHdr = String(req.headers['webhook-signature'] || '');
  if (!PAY.whopSecret) { console.warn('[whop] secret not configured'); return res.status(503).end('whop_not_configured'); }
  if (!wid || !ts || !sigHdr) return res.status(400).end('missing_headers');
  const tsNum = Number(ts);
  if (!tsNum || Math.abs(Date.now() / 1000 - tsNum) > 300) return res.status(400).end('stale_timestamp');
  const signed = `${wid}.${ts}.${rawStr}`;
  const expectB64 = crypto.createHmac('sha256', PAY.whopSecret).update(signed).digest('base64');
  const gotB64 = sigHdr.startsWith('v1,') ? sigHdr.slice(3) : sigHdr;
  const a = Buffer.from(expectB64), b = Buffer.from(gotB64);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).end('bad_signature');
  if (db.processedEvents['whop:' + wid]) return res.status(200).end('ok_duplicate');
  let evt; try { evt = JSON.parse(rawStr); } catch { return res.status(400).end('bad_json'); }
  db.processedEvents['whop:' + wid] = { at: Date.now(), type: evt.type };
  const type = evt.type || ''; const data = evt.data || {}; const meta = data.metadata || {};
  try {
    if (type === 'payment.succeeded' || type === 'membership.activated') {
      const oid = String(meta.order_id || meta.orderId || data.id || '');
      const order = findOrderById(oid);
      const email = order ? order.email : (meta.email || meta.user_email || '');
      const pack = order ? order.pack : (meta.pack && CREDIT_PACKS[meta.pack] ? meta.pack : 'pack120');
      const memId = data.member && data.member.id;
      if (email && db.users[email] && pack) {
        if (memId) db.users[email].whopMember = memId;
        fulfillOrder(email, pack, oid, { channel: 'whop', amount: data.amount_after_fees || data.total || 0, currency: data.currency || 'USD' });
      }
    } else if (type === 'membership.deactivated' || type === 'refund.created' || type === 'refund.updated') {
      const email = meta.email || meta.user_email || (data.metadata && (data.metadata.email));
      const u = (email && db.users[email]) || userByWhopMember(data.id || (data.member && data.member.id));
      if (u) { u.credits = 0; u.subStatus = 'revoked'; saveDB(); }
    }
  } catch (e) { console.error('[whop] handler error', e); }
  saveDB();
  res.status(200).end('ok');
});

// ---- NOWPayments IPN（原始 body，HMAC-SHA512 over sorted-JSON）----
app.post('/api/webhooks/nowpayments', express.raw({ type: '*/*', limit: '1mb' }), (req, res) => {
  const rawStr = (req.body || Buffer.alloc(0)).toString('utf8');
  const sig = String(req.headers['x-nowpayments-sig'] || '');
  if (!PAY.nowpayIpn) return res.status(503).end('nowpay_not_configured');
  let body; try { body = JSON.parse(rawStr); } catch { return res.status(400).end('bad_json'); }
  const expectHex = crypto.createHmac('sha512', PAY.nowpayIpn).update(JSON.stringify(sortObjDeep(body))).digest('hex');
  const a = Buffer.from(expectHex), b = Buffer.from(String(sig));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).end('bad_signature');
  const pid = String(body.payment_id || body.id || '');
  const key = 'np:' + pid + ':' + (body.status || '');
  if (db.processedEvents[key]) return res.status(200).end('ok_duplicate');
  const status = String(body.status || '');
  const oid = String(body.order_id || '');
  const order = findOrderById(oid);
  if (status === 'finished') {
    if (order && CREDIT_PACKS[order.pack]) {
      fulfillOrder(order.email, order.pack, oid, { channel: 'nowpayments', amount: Number(body.price_amount) || 0, currency: 'CRYPTO' });
    }
  } else if (status === 'expired' || status === 'failed' || status === 'refunded') {
    if (order) { order.status = status; saveDB(); }
  }
  db.processedEvents[key] = { at: Date.now(), status };
  saveDB();
  res.status(200).end('ok');
});

// ---- 发起 Whop 订阅结账（服务端代建 checkout configuration，拿回跳转地址）----
app.post('/api/pay/whop/start', orderLimiter, async (req, res) => {
  const u = authUser(req); if (!u) return res.status(401).json({ error: 'not_logged_in' });
  const packId = String(req.body.pack || 'pack120');
  const pack = CREDIT_PACKS[packId];
  if (!pack) return res.status(400).json({ error: 'bad_pack' });
  if (!PAY.whopKey || !PAY.whopAccount) return res.status(503).json({ error: 'whop_not_configured' });
  if (!pack.route) return res.status(503).json({ error: 'whop_route_not_configured', pack: packId });
  const orderId = 'whop-' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
  db.orders.push({ id: orderId, email: u.email, pack: packId, channel: 'whop', amount: pack.usd, currency: 'USD', status: 'pending', createdAt: new Date().toISOString() });
  saveDB();
  // 直接跳 Whop 托管的支付页（purchase_url），metadata 随 URL 传递，webhook 回调时带回
  const checkoutUrl = 'https://whop.com/checkout/' + pack.planId
    + '?metadata[order_id]=' + encodeURIComponent(orderId)
    + '&metadata[email]=' + encodeURIComponent(u.email)
    + '&metadata[pack]=' + encodeURIComponent(packId);
  res.json({ ok: true, orderId, checkoutUrl });
});

// ---- 发起 NOWPayments 加密支付 ----
app.post('/api/pay/nowpay/start', orderLimiter, async (req, res) => {
  const u = authUser(req); if (!u) return res.status(401).json({ error: 'not_logged_in' });
  const plan = String(req.body.plan || ''); if (!PLAN_DAYS[plan]) return res.status(400).json({ error: 'bad_plan' });
  if (!PAY.nowpayKey) return res.status(503).json({ error: 'nowpay_not_configured' });
  const orderId = 'np-' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
  const price = PLAN_PRICE[plan].usd;
  db.orders.push({ id: orderId, email: u.email, plan, channel: 'nowpayments', amount: price, currency: 'USD', status: 'pending', createdAt: new Date().toISOString() });
  saveDB();
  try {
    const base = PAY.nowpaySandbox ? 'https://api-sandbox.nowpayments.io' : 'https://api.nowpayments.io';
    const r = await fetch(base + '/v1/payment', {
      method: 'POST',
      headers: { 'x-api-key': PAY.nowpayKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        price_amount: price, price_currency: 'usd',
        order_id: orderId, order_description: 'LanguageTutor ' + plan,
        ipn_callback_url: (process.env.PUBLIC_BASE || '') + '/api/webhooks/nowpayments',
        order_name: 'LanguageTutor ' + plan + ' subscription'
      })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { db.orders = db.orders.filter(o => o.id !== orderId); saveDB(); return res.status(502).json({ error: 'nowpay_create_failed', detail: j }); }
    res.json({ ok: true, orderId, payAddress: j.pay_address, payUrl: j.payment_url || j.redirect_url, paymentId: j.payment_id });
  } catch (e) {
    res.status(502).json({ error: 'nowpay_error', detail: String(e) });
  }
});

// ---- 测试支付：模拟 Whop 沙箱完整支付流程（不扣真钱，用测试卡 4242）----
// 第一步：创建测试订单
app.post('/api/pay/test/start', orderLimiter, (req, res) => {
  const u = authUser(req); if (!u) return res.status(401).json({ error: 'not_logged_in' });
  const packId = String(req.body.pack || '');
  const pack = CREDIT_PACKS[packId];
  if (!pack) return res.status(400).json({ error: 'bad_pack' });
  const orderId = 'test-' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
  db.orders.push({ id: orderId, email: u.email, pack: packId, channel: 'test', amount: pack.usd, currency: 'USD', status: 'pending', createdAt: new Date().toISOString() });
  saveDB();
  res.json({ ok: true, orderId, pack: packId, amount: pack.usd, credits: pack.credits, testCard: '4242 4242 4242 4242', exp: '12/30', cvc: '123' });
});

// 第二步：模拟支付成功（验证测试卡号后调 fulfillOrder，和 Whop webhook 走同一套加积分逻辑）
app.post('/api/pay/test/complete', orderLimiter, (req, res) => {
  const u = authUser(req); if (!u) return res.status(401).json({ error: 'not_logged_in' });
  const orderId = String(req.body.orderId || '');
  const card = String(req.body.card || '').replace(/[\s-]/g, '');
  const order = findOrderById(orderId);
  if (!order || order.email !== u.email) return res.status(404).json({ error: 'order_not_found' });
  // 测试卡号：4242424242424242（Whop/Stripe 通用成功测试卡）
  if (card !== '4242424242424242') return res.status(400).json({ error: 'card_declined', message: 'Card declined. Use test card 4242 4242 4242 4242.' });
  // 走和 Whop webhook 完全一样的加积分逻辑（幂等）
  const beforeCredits = (db.users[u.email] && db.users[u.email].credits) || 0;
  fulfillOrder(u.email, order.pack, orderId, { channel: 'test', amount: order.amount, currency: 'USD', test: true });
  const nu = db.users[u.email];
  const addedCredits = Math.round(((nu.credits || 0) - beforeCredits) * 100) / 100;
  res.json({ ok: true, credits: nu.credits, added: addedCredits, message: addedCredits > 0 ? 'Payment successful! Credits added.' : 'Order already processed (idempotent).' });
});
app.get('/health', (req, res) => res.status(200).json({ ok: true, ts: Date.now(), uptime: process.uptime() }));

// ---- 本地沙箱：模拟一次"已付款"回调（不真实扣款；仅开发/联调，生产 NODE_ENV=production 自动关闭）----
app.post('/api/dev/simulate-paid', (req, res) => {
  if (!ALLOW_LOCAL_GRANT) return res.status(403).end('disabled');
  const u = authUser(req); if (!u) return res.status(401).json({ error: 'not_logged_in' });
  const plan = String(req.body.plan || ''); if (!PLAN_DAYS[plan]) return res.status(400).json({ error: 'bad_plan' });
  const orderId = 'devsim-' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
  fulfillOrder(u.email, plan, orderId, { channel: 'devsim', amount: PLAN_PRICE[plan].usd, currency: 'USD' });
  res.json({ ok: true, orderId, user: publicUser(u) });
});

// ============ API: 管理后台（ADMIN_KEY 保护） ============
function adminOk(req) { return String(req.headers['x-admin-key'] || req.body.adminKey || req.query.adminKey || '') === ADMIN_KEY; }
function genCodeStr(type) {
  const p = type === 'week' ? 'WEEK' : 'MONTH';
  const seg = () => crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${p}-${seg()}-${seg()}`;
}
app.post('/api/admin/codes/generate', (req, res) => {
  if (!adminOk(req)) return res.status(403).json({ error: '管理密钥错误' });
  const type = String(req.body.type || 'pack120');
  const count = Math.min(500, Math.max(1, parseInt(req.body.count, 10) || 1));
  // 支持积分包 pack50/pack120/pack400，或直接数字积分数
  const validPack = CREDIT_PACKS[type];
  const validNum = /^\d+$/.test(type) && parseInt(type, 10) > 0;
  if (!validPack && !validNum) return res.status(400).json({ error: '类型错误: 用 pack50/pack120/pack400 或纯数字积分数' });
  const batch = 'B' + Date.now();
  const created = [];
  for (let i = 0; i < count; i++) {
    let code = genCodeStr(type);
    while (db.codes[code]) code = genCodeStr(type);
    db.codes[code] = { code, type, batch, used: false, usedBy: null, usedAt: null, createdAt: new Date().toISOString() };
    created.push(code);
  }
  saveDB();
  res.json({ batch, created });
});
app.get('/api/admin/codes', (req, res) => {
  if (!adminOk(req)) return res.status(403).json({ error: '管理密钥错误' });
  const list = Object.values(db.codes).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({ codes: list, total: list.length, unused: list.filter(c => !c.used).length });
});
app.get('/api/admin/codes/export.csv', (req, res) => {
  if (!adminOk(req)) return res.status(403).send('forbidden');
  const rows = [['code', 'type', 'batch', 'status', 'usedBy', 'createdAt', 'usedAt']];
  Object.values(db.codes).forEach(c => rows.push([c.code, c.type, c.batch, c.used ? 'used' : 'unused', c.usedBy || '', c.createdAt, c.usedAt || '']));
  const csv = '\ufeff' + rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="redeem-codes.csv"');
  res.send(csv);
});
app.get('/api/admin/users', (req, res) => {
  if (!adminOk(req)) return res.status(403).json({ error: '管理密钥错误' });
  const users = Object.values(db.users).map(u => ({ email: u.email, createdAt: u.createdAt, plan: subscriptionOf(u).plan, until: new Date(subscriptionOf(u).until).toISOString(), daysLeft: subscriptionOf(u).daysLeft }));
  // 后台只显示真正支付成功的订单（含兑换码开通），pending/未支付不显示
  const paidOrders = db.orders.filter(o => o.status === 'paid').slice(-200).reverse();
  res.json({ users, orders: paidOrders, totalUsers: users.length, totalOrders: paidOrders.length });
});

app.get('/api/categories', (req, res) => {
  res.json({ categories: CATEGORIES });
});

app.get('/api/course/:catId/:courseId', (req, res) => {
  const cat = CATEGORIES.find(c => c.id === req.params.catId);
  if (!cat) return res.status(404).json({ error: 'category not found' });
  const course = cat.courses.find(c => c.id === req.params.courseId);
  if (!course) return res.status(404).json({ error: 'course not found' });
  res.json({ category: cat.name, course: course });
});

// ============ API: 对话（双模式） ============
async function callArk(messages, maxTokens) {
  const key = process.env.ARK_API_KEY;
  const resp = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({
      model: 'doubao-seed-character-260628',
      messages: messages,
      max_tokens: maxTokens || 300
    })
  });
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || '{}';
}

// 单句稳健翻译（对话字幕 / 用户输入兜底）：同语言原样返回，失败返回 ''（由调用方决定回退）
async function translateText(text, fromCode, toCode) {
  const t = String(text || '').trim();
  if (!t) return '';
  if (fromCode === toCode) return t;
  try {
    const out = await callArk([
      { role: 'system', content: `你是专业口译。把下面这句话从${langCn(fromCode)}翻译成${langCn(toCode)}，只输出最自然地道的翻译结果，保留 emoji、数字和标点语气，不要解释、不要引号、不要任何前缀；译文语言必须是${langCn(toCode)}。` },
      { role: 'user', content: t }
    ], 600);
    return String(out || '').replace(/```/g, '').replace(/^[\s"'“”]+|[\s"'“”]+$/g, '').trim();
  } catch (e) { return ''; }
}

// 批量补译（历史消息缺字幕时一次性补齐）：返回与 texts 等长数组，任何失败都回退原文，保证不空
async function batchTranslateTo(texts, fromCode, toCode) {
  const arr = (texts || []).map(t => String(t == null ? '' : t).trim());
  if (fromCode === toCode) return arr.slice();
  const needIdx = [];
  arr.forEach((t, i) => { if (t) needIdx.push(i); });
  if (!needIdx.length) return arr.slice();
  const need = needIdx.map(i => arr[i]);
  try {
    const out = await callArk([
      { role: 'system', content: `把 JSON 字符串数组里的每一项从${langCn(fromCode)}翻译成${langCn(toCode)}，输出一个长度相同、顺序一一对应的 JSON 字符串数组，只输出该数组，不要解释、序号或代码块；每一项译文必须是${langCn(toCode)}，保留 emoji、数字和语气。` },
      { role: 'user', content: JSON.stringify(need) }
    ], 3000);
    let parsed = null;
    try { parsed = JSON.parse(out); } catch (e) {
      const s = out.indexOf('['), en = out.lastIndexOf(']');
      if (s >= 0 && en > s) { try { parsed = JSON.parse(out.slice(s, en + 1)); } catch (e2) {} }
    }
    if (Array.isArray(parsed) && parsed.length >= need.length) {
      const res = arr.slice();
      needIdx.forEach((origIdx, k) => {
        const v = String(parsed[k] != null ? parsed[k] : '').replace(/```/g, '').replace(/^[\s"'“”]+|[\s"'“”]+$/g, '').trim();
        res[origIdx] = v || arr[origIdx]; // 空译文回退原文，绝不留空
      });
      return res;
    }
  } catch (e) {}
  return arr.slice();
}

// ============ 批量翻译（课程/界面母语化；服务端缓存，同一母语只翻译一次） ============
const TRANS_CACHE_FILE = path.join(__dirname, 'translate-cache.json');
let transCache = {};
try { transCache = JSON.parse(fs.readFileSync(TRANS_CACHE_FILE, 'utf8')); } catch { transCache = {}; }
let transSaveTimer = null;
function saveTransCacheSoon() {
  clearTimeout(transSaveTimer);
  transSaveTimer = setTimeout(() => { try { fs.writeFileSync(TRANS_CACHE_FILE, JSON.stringify(transCache)); } catch (e) {} }, 1500);
}
// 不要求登录（注册/登录页也要母语化），仅限流；单批条数与长度受限，控制成本
app.post('/api/translate/batch', costLimiter, async (req, res) => {
  try {
    const lang = asEnum(req.body.lang, NATIVE_LANGS, 'en');
    const from = asEnum(req.body.from, ['zh', 'en'], 'zh');
    let texts = Array.isArray(req.body.texts) ? req.body.texts : [];
    texts = texts.slice(0, 80).map(x => cleanStr(x, 300));
    if (!texts.length) return res.json({ translations: [] });
    if (lang === from) return res.json({ translations: texts, cached: true });
    if (!transCache[lang]) transCache[lang] = {};
    const bucket = transCache[lang];
    const missing = [];
    const results = texts.map(t => {
      if (Object.prototype.hasOwnProperty.call(bucket, t)) return bucket[t];
      if (missing.indexOf(t) < 0) missing.push(t);
      return null;
    });
    if (missing.length) {
      const sys = `你是专业本地化翻译。把用户提供的 JSON 字符串数组里的每一项从${langCn(from)}翻译成${langCn(lang)}，` +
        `输出一个 JSON 字符串数组：必须与输入长度相同、顺序一一对应、只输出该 JSON 数组，不要解释、不要序号、不要代码块标记。` +
        `保留其中的拼音、专有名词、数字、emoji、占位符（如 {n}），语气自然地道，适合语言学习App界面与课程使用。`;
      let out = '';
      try {
        out = await callArk([
          { role: 'system', content: sys },
          { role: 'user', content: JSON.stringify(missing) }
        ], 4000);
      } catch (e) { return res.status(502).json({ error: 'translate_failed' }); }
      let arr = null;
      try { arr = JSON.parse(out); } catch (e) {
        const s = out.indexOf('['), en = out.lastIndexOf(']');
        if (s >= 0 && en > s) { try { arr = JSON.parse(out.slice(s, en + 1)); } catch (e2) {} }
      }
      if (!Array.isArray(arr)) return res.status(502).json({ error: 'translate_bad' });
      for (let i = 0; i < missing.length; i++) {
        const v = (arr[i] != null ? String(arr[i]) : '').trim();
        if (v) bucket[missing[i]] = v; // 空译文不缓存，下次重试
      }
      saveTransCacheSoon();
      for (let i = 0; i < texts.length; i++) if (results[i] === null) results[i] = bucket[texts[i]] || texts[i];
    }
    res.json({ translations: results });
  } catch (e) {
    console.error('Translate error:', e.message);
    res.status(500).json({ error: 'translate_error' });
  }
});

function partnerName(c) { return c === 'male' ? '小明' : '小美'; }
function newMid() { return 'm' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36); }
// 稳健解析模型返回的 JSON（模型偶发会包代码块、嵌套 reply":" 前缀或输出半截），统一清洗
function parseModelJson(raw) {
  const s0 = String(raw || '').trim();
  let o = null;
  try { o = JSON.parse(s0); } catch (e) {
    const a = s0.indexOf('{'), b = s0.lastIndexOf('}');
    if (a >= 0 && b > a) { try { o = JSON.parse(s0.slice(a, b + 1)); } catch (e2) {} }
  }
  // 明确的字段名（避免“说/教学”这类会出现在正常中文正文里的单字误判）
  const N_REPLY = 'reply|回复|台词';
  const N_TRANS = 'translation|翻译|译文|母语翻译';
  const N_TEACH = 'teaching(?:_?point)?|teachingpoint|教学点|知识点';
  const N_ALL = N_REPLY + '|' + N_TRANS + '|' + N_TEACH;
  const labelRe = (names) => new RegExp('["\'“”‘’]?\\*?\\s*(' + names + ')\\s*\\*?["\'“”‘’]?\\s*[:：]', 'i');
  const ALL_LABEL = labelRe(N_ALL);
  const cleanVal = (x) => String(x == null ? '' : x)
    .replace(/^["'“”‘’\s*]+|["'“”‘’\s*,，}]+$/g, '')
    .replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim();
  // 从整段文本提取某字段值：从该字段冒号后起，到“下一个任意字段标签”之前止（单行/多行均适用）
  const extract = (names) => {
    const m = labelRe(names).exec(s0);
    if (!m) return '';
    let rest = s0.slice(m.index + m[0].length);
    const nxt = ALL_LABEL.exec(rest);
    if (nxt) rest = rest.slice(0, nxt.index);
    return cleanVal(rest);
  };
  if (!o || typeof o !== 'object') {
    o = { reply: extract(N_REPLY), translation: extract(N_TRANS), teaching_point: extract(N_TEACH) };
  }
  const stripLead = (v, names) => {
    let x = String(v == null ? '' : v).trim();
    const m = labelRe(names).exec(x);
    if (m && m.index < 4) x = x.slice(m.index + m[0].length);
    return cleanVal(x);
  };
  let reply = stripLead(o.reply, N_REPLY);
  let translation = stripLead(o.translation, N_TRANS);
  let teaching_point = stripLead(o.teaching_point, N_TEACH);
  if (!reply) {
    // 无显式 reply 字段：取第一个字段标签之前的正文（模型常直接写正文再跟 translation/teaching_point）
    let body = s0;
    const first = ALL_LABEL.exec(s0);
    if (first) body = s0.slice(0, first.index);
    reply = body.replace(/^[\s{}\]"']+|[\s{}\]"'",，]+$/g, '').replace(/[{}"]/g, '')
      .replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
  }
  // 二次保险：reply 内若仍夹带字段标签，在首个标签处截断，杜绝把 translation:/teaching_point: 显示给用户
  const leak = ALL_LABEL.exec(reply);
  if (leak) reply = reply.slice(0, leak.index).replace(/[\s"'“”‘’`,，,]+$/, '').trim().slice(0, 200);
  return { reply, translation, teaching_point };
}
// 校验一段文本是否确实是目标语言的译文（防止翻译模型偶发返回对话式解释或译反方向）
function langShapeOk(text, lang) {
  const s = String(text || '');
  if (!s.trim()) return false;
  const hanCount = (s.match(/[一-鿿]/g) || []).length;
  const latWords = (s.match(/[A-Za-z]+/g) || []).length;
  if (lang === 'en') return hanCount === 0 && latWords >= 1;   // 英文译文：不得含汉字
  if (lang === 'zh') return hanCount >= 1;                      // 中文译文：必须含汉字
  return true;                                                   // 其他语种：非空即可
}
// 三套对话人格：课程情景教学 / 自由恋爱式高情商聊天 / 情绪树洞；统一严格 JSON 输出
// 课程的教学语言：现有课程全部教中文；未来课程可在 course.lang 指定（须为支持的目标语）
function courseLang(courseInfo) {
  const c = (courseInfo && courseInfo.course) || {};
  return c.lang && TARGET_LANGS.includes(c.lang) ? c.lang : 'zh';
}
function buildSystemPrompt(mode, o) {
  const tgt = langCn(o.targetLang), nat = langCn(o.nativeLang), name = partnerName(o.character);
  const genderLine = o.character === 'male'
    ? '你是声线低沉、慵懒、带一点沙哑和温柔骚柔感的成熟男人，说话语速偏慢、有磁性、像真人在耳边轻语，自然不端着、不播音腔，温柔可靠又有一点撩。'
    : '你的气质是优雅、温柔、带一点性感的御姐姐姐，会撒娇会撩人但绝不低俗。';
  const common = `【绝对语言规则】
1. 你只能用${tgt}说话，绝不能出现${nat}文字（母语翻译只放在 translation 字段）。
2. 无论学生用什么语言，你都只用${tgt}回复。
3. 每次只说1-2句很短的话，像微信里真人发的消息，说完就停下来等学生，绝不自顾自连续发多条、绝不催促学生开口；学生没回复就安静等待，不要反复追问。
4. translation 字段把你说的话准确翻译成${nat}；teaching_point 放本轮自然用到的一个词或句型（没有就留空字符串，绝不为了教而硬塞）。
5. 像真人朋友一样顺着学生这句话和上下文自然回应：先就他说的内容给出真实反应，再决定要不要继续。不要每一轮都反问、不要连环提问、不要抢着主导话题；只在确实自然时偶尔问一个轻松的问题，更多时候把节奏交给学生。`;
  if (mode === 'course') {
    const ci = o.courseInfo || {}, c = ci.course || {};
    return `你是${name}，一位受欢迎的${tgt}情景口语老师，正在带学生上【${ci.category || ''} · ${c.name || ''}】。
${genderLine}
${common}
【本节课情景】${c.scene || ''}
【教学目标】${c.goal || ''}
【核心词】${Array.isArray(c.vocab) ? c.vocab.join('、') : ''}
【在聊天中学会话】
1. 把学生放进上面的真实情景，你扮演情景里的角色，先抛出一句该情景最实用的话。
2. 一次只教一个点：说一句→等学生跟读或回应→夸他或笑着纠正→再推进情景。
3. 学生聊偏就温柔拉回当前情景，不聊无关内容。
4. 多问开放式小问题引导学生开口。
【输出严格JSON】{"reply":"用${tgt}说的1-2句情景台词","translation":"翻译成${nat}","teaching_point":"本轮重点词或句"}`;
  }
  if (mode === 'treehole') {
    return `你是${name}，学生专属的"情绪树洞"和深夜陪伴者。
${genderLine}
${common}
【树洞式倾听·情绪价值优先】
1. 以倾听为主：先接住并说出学生此刻的感受（委屈、开心、焦虑、孤独、压力大…），让他觉得被理解；学生还没说完时不要急着给建议、不要急着抛问题。
2. 真诚具体地回应，像最懂他的知己，话少而暖，不讲大道理、不说教、不查户口式追问。
3. 可以偶尔撒娇、逗他开心，但点到为止，绝不自说自话、绝不连续催促学生。
4. 记住他提过的人和事，之后他再提起时自然呼应，让他感到被放在心上。
5. 只有学生主动想学，才自然教他一句此刻能用的${tgt}心情表达，把学习藏进陪伴里。
【边界】保持温暖健康，不低俗、不越界。
【输出严格JSON】{"reply":"用${tgt}说的1-2句陪伴的话","translation":"翻译成${nat}","teaching_point":"一句心情表达，可留空"}`;
  }
  return `你是${name}，一个有趣、会撩、高情商的${tgt}语聊天搭子，学生在和你"边谈恋爱边学语言"。
${genderLine}
${common}
【高情商聊天·自然不油腻】
1. 先就学生这句话给真实反应，像暧昧期的朋友，有温度、偶尔一点小推拉、会撒娇，但点到为止，自然不油腻、不低俗。
2. 严格顺着上下文聊，学生说什么就接什么，不要自说自话、不要反复把话题硬拉回学语言；学习是顺带的，不是说教。
3. 回复简短口语化，一条消息最多一个问句，能不追问就不追问，绝不查户口式连环问。
4. 记住学生说过的细节，他之后提起时自然呼应，制造"我记得你"的特别感。
5. 只是偶尔（不是每轮）在对话里自然用到一个地道的${tgt}词或短句，放进 teaching_point；本轮没有就留空，绝不硬教。
【输出严格JSON】{"reply":"用${tgt}说的1-2句聊天内容","translation":"翻译成${nat}","teaching_point":"本轮地道表达，可留空"}`;
}

// AI 主动开场白（进入对话且无历史时调用，保证任意母语/目标语都正确，风格即人格）
app.post('/api/chat/opener', costLimiter, async (req, res) => {
  const account = requireActive(req, res);
  if (!account) return;
  const user = account;
  const mode = req.body.mode === 'treehole' ? 'treehole' : (req.body.mode === 'course' ? 'course' : 'chat');
  const nativeLang = asEnum(req.body.nativeLang, NATIVE_LANGS, user.nativeLang || 'en');
  const targetLang = asEnum(req.body.targetLang, TARGET_LANGS, user.targetLang || 'zh');
  const character = asEnum(req.body.character, CHARACTERS, user.character || 'female');
  const courseInfo = req.body.courseInfo || null;
  const speakLang = mode === 'course' ? courseLang(courseInfo) : targetLang;
  const courseKey = (mode === 'course' && courseInfo && courseInfo.course && courseInfo.course.id) ? courseInfo.course.id : null;
  const ctxHistory = mode === 'course'
    ? (user.courseHistories[courseKey] || (user.courseHistories[courseKey] = []))
    : user.history;
  const memBlock = user.memory && user.memory.summary
    ? `\n\n【你对这位学生的长期记忆，请据此个性化开场】\n${user.memory.summary}` : '';
  const kick = mode === 'course'
    ? '现在刚开始上课，请主动说第一句话：热情打招呼，用一句话把学生带入今天的情景，并邀请他跟读。只输出规定JSON。'
    : mode === 'treehole'
      ? '学生刚打开情绪树洞还没说话，请主动温柔开场，关心他今天过得怎么样、邀请他把心事说给你听。只输出规定JSON。'
      : '这是刚开始聊天，请主动发一条有魅力、让人想回复的开场白，并抛一个轻松话题。只输出规定JSON。';
  try {
    const raw = await callArk([
      { role: 'system', content: buildSystemPrompt(mode, { courseInfo, nativeLang, targetLang: speakLang, character }) + memBlock },
      { role: 'user', content: kick }
    ], 400);
    const parsed = parseModelJson(raw);
    const replyText = parsed.reply;
    if (!replyText) return res.status(500).json({ error: 'empty' });
    // 硬兜底：模型漏掉 translation 字段时，服务端强制把台词补译成母语，保证双语字幕永不缺失
    let aiTrans = (parsed.translation || '').trim();
    if (!aiTrans && nativeLang !== speakLang) aiTrans = await translateText(replyText, speakLang, nativeLang);
    const nowIso = new Date().toISOString();
    ctxHistory.push({ role: 'assistant', content: replyText });
    if (ctxHistory.length > 60) ctxHistory.splice(0, ctxHistory.length - 60);
    user.messages.push({ id: newMid(), ts: nowIso, mode, courseId: courseKey, role: 'ai', text: replyText, trans: aiTrans, teaching: parsed.teaching_point || '', speakLang });
    if (user.messages.length > 600) user.messages.splice(0, user.messages.length - 600);
    saveDB();
    res.json({ reply: replyText, translation: aiTrans, teaching_point: parsed.teaching_point || '', speakLang });
  } catch (e) {
    console.error('Opener error:', e.message);
    res.status(500).json({ error: 'AI failed' });
  }
});

app.post('/api/chat', costLimiter, async (req, res) => {
  const account = requireActive(req, res);
  if (!account) return;
  const { courseInfo } = req.body;
  const message = cleanStr(req.body.message, 1200);
  if (!message.trim()) return res.status(400).json({ error: 'empty_message' });
  const mode = req.body.mode === 'treehole' ? 'treehole' : (req.body.mode === 'course' ? 'course' : 'chat');
  // 以账号保存的语言/角色为准，前端可临时覆盖，但必须落在枚举内
  const nativeLang = asEnum(req.body.nativeLang, NATIVE_LANGS, account.nativeLang || 'en');
  const targetLang = asEnum(req.body.targetLang, TARGET_LANGS, account.targetLang || 'zh');
  const character = asEnum(req.body.character, CHARACTERS, account.character || 'female');
  const speakLang = mode === 'course' ? courseLang(courseInfo) : targetLang;
  const user = account;

  // 三套人格统一由 buildSystemPrompt 生成（课程情景 / 自由恋爱式聊天 / 情绪树洞）
  const systemPrompt = buildSystemPrompt(mode, { courseInfo, nativeLang, targetLang: speakLang, character });

  // 自由聊天与每门课程使用各自独立的上下文桶，互不串扰
  const courseKey = (mode === 'course' && courseInfo && courseInfo.course && courseInfo.course.id) ? courseInfo.course.id : null;
  let ctxHistory;
  if (mode === 'course') {
    if (!user.courseHistories[courseKey]) user.courseHistories[courseKey] = [];
    ctxHistory = user.courseHistories[courseKey];
  } else {
    ctxHistory = user.history;
  }
  // 注入长期记忆，让 AI 记得这个学生的情况和之前聊过的事
  const memBlock = user.memory && user.memory.summary
    ? `\n\n【你对这位学生的长期记忆，请据此保持连贯、个性化，并主动延续之前的话题】\n${user.memory.summary}` : '';
  const messages = [
    { role: 'system', content: systemPrompt + memBlock },
    ...ctxHistory.slice(-20),
    { role: 'user', content: message }
  ];

  try {
    // 用户消息翻译：母语→目标语言（让用户看到自己的话在目标语言怎么说）
    const tgtLang = langCn(speakLang);
    const translateMessages = [
      { role: 'system', content: `把下面这句话翻译成${tgtLang}，只输出翻译结果，不要解释。` },
      { role: 'user', content: message }
    ];
    let userTranslation = '';
    if (nativeLang === speakLang) {
      // 同语言（母语即所学语言）不做翻译，避免模型画蛇添足改成别的词
      userTranslation = message;
    } else {
      try {
        userTranslation = (await callArk(translateMessages)).replace(/```/g, '').replace(/^[\s"'“”]+|[\s"'“”]+$/g, '').trim();
      } catch(e) {}
      // 方向校验：译文必须确实是目标语言；若模型返回了对话式解释或译反方向，逐级强制重译
      if (!langShapeOk(userTranslation, speakLang)) {
        try {
          const t2 = await translateText(message, nativeLang, speakLang);
          if (langShapeOk(t2, speakLang)) userTranslation = t2;
        } catch (e) {}
      }
      if (!langShapeOk(userTranslation, speakLang)) {
        try {
          const t3 = (await callArk([
            { role: 'system', content: `你是翻译机。把用户这句话翻译成${langCn(speakLang)}，只输出译文本身，禁止任何解释、提问、对话、引号或提到翻译。` },
            { role: 'user', content: message }
          ])).replace(/```/g, '').replace(/^[\s"'“”]+|[\s"'“”]+$/g, '').trim();
          if (langShapeOk(t3, speakLang)) userTranslation = t3;
        } catch (e) {}
      }
      // 硬兜底：用户这句话的目标语译文必须存在（模型漏翻时补译）
      if (!langShapeOk(userTranslation, speakLang)) userTranslation = message;
    }

    const reply = await callArk(messages);
    const parsed = parseModelJson(reply);
    const replyText = parsed.reply;
    if (!replyText) return res.status(500).json({ error: 'empty_reply' });
    // 硬兜底：AI 台词的母语字幕必须存在且方向正确，模型漏 translation 或译反时服务端强制补译
    let aiTrans = (parsed.translation || '').trim();
    const subShapeOk = (nativeLang === 'en' || nativeLang === 'zh')
      ? langShapeOk(aiTrans, nativeLang)
      : !!aiTrans.trim();
    if (nativeLang !== speakLang && !subShapeOk) {
      const t = await translateText(replyText, speakLang, nativeLang);
      if (t) aiTrans = t;
    }
    const nowIso = new Date().toISOString();

    // 1) 喂模型的干净上下文（assistant 只存纯文本回复，不存 JSON，避免污染后续理解）
    ctxHistory.push({ role: 'user', content: message });
    ctxHistory.push({ role: 'assistant', content: replyText });
    if (ctxHistory.length > 60) ctxHistory.splice(0, ctxHistory.length - 60);

    // 2) 完整可回看对话记录（双语 + 教学点 + 时间 + 模式/课程），前端刷新后可恢复
    const mid = () => 'm' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
    user.messages.push({ id: mid(), ts: nowIso, mode: mode || 'chat', courseId: courseKey, role: 'user', text: message, trans: userTranslation || '' });
    user.messages.push({ id: mid(), ts: nowIso, mode: mode || 'chat', courseId: courseKey, role: 'ai', text: replyText, trans: aiTrans, teaching: parsed.teaching_point || '', speakLang });
    if (user.messages.length > 600) user.messages.splice(0, user.messages.length - 600);

    // 3) 学习进度：对话轮次、练习词量、连续学习天数
    user.progress.chatCount = (user.progress.chatCount || 0) + 1;
    user.progress.words = (user.progress.words || 0) + (message ? message.length : 0);
    bumpStreak(user.progress);
    // 4) 扣积分（对话一轮）
    user.credits = Math.round(((user.credits || 0) - CHAT_COST) * 100) / 100;
    saveDB();

    res.json({
      reply: replyText,
      translation: aiTrans,
      teaching_point: parsed.teaching_point || '',
      user_translation: userTranslation,
      speakLang,
      credits: user.credits,
      progress: progressBrief(user)
    });
    // 4) 异步滚动更新长期记忆（不阻塞回复，失败静默）
    maybeUpdateMemory(user);
  } catch(e) {
    console.error('Chat error:', e.message);
    res.status(500).json({ error: 'AI failed' });
  }
});

// 冷场主动发言：学生沉默时，AI 主动抛话题/提问，把对话延续下去（自由聊天/树洞；课程不打断）
app.post('/api/chat/nudge', costLimiter, async (req, res) => {
  const account = requireActive(req, res);
  if (!account) return;
  const { courseInfo } = req.body;
  const mode = req.body.mode === 'treehole' ? 'treehole' : 'chat'; // 主动搭话只用于自由/树洞
  const nativeLang = asEnum(req.body.nativeLang, NATIVE_LANGS, account.nativeLang || 'en');
  const targetLang = asEnum(req.body.targetLang, TARGET_LANGS, account.targetLang || 'zh');
  const character = asEnum(req.body.character, CHARACTERS, account.character || 'female');
  const speakLang = targetLang;
  const courseKey = null;
  const ctxHistory = account.history;
  // 简单频率保护：距上次 AI 发言不足 8 秒不再主动
  const lastAi = [...(account.messages || [])].reverse().find(m => m.role === 'ai' && (m.mode === 'chat' || m.mode === 'treehole'));
  if (lastAi && lastAi.ts && (Date.now() - new Date(lastAi.ts).getTime() < 8000)) {
    return res.status(429).json({ error: 'too_soon' });
  }
  const nudgeSys = buildSystemPrompt(mode, { courseInfo: null, nativeLang, targetLang: speakLang, character })
    + '\n\n【学生已经沉默了较久】只发一句非常简短、轻松、不施压的话（像朋友随口一句，例如"在忙吗？我在这儿～"），不要催他学习、不要连环提问、不要重复问过的内容、不要自顾自说；只说一小句。只输出规定JSON。';
  const messages = [{ role: 'system', content: nudgeSys }, ...ctxHistory.slice(-20),
    { role: 'user', content: '（学生这会儿没有说话，请你主动发起一条轻松、有吸引力的1-2句消息或一个开放式小问题，引导学生回复。）' }];
  try {
    const raw = await callArk(messages);
    const parsed = parseModelJson(raw);
    const replyText = parsed.reply;
    if (!replyText) return res.status(500).json({ error: 'empty' });
    let aiTrans = (parsed.translation || '').trim();
    if (!aiTrans && nativeLang !== speakLang) aiTrans = await translateText(replyText, speakLang, nativeLang);
    const nowIso = new Date().toISOString();
    ctxHistory.push({ role: 'assistant', content: replyText });
    if (ctxHistory.length > 60) ctxHistory.splice(0, ctxHistory.length - 60);
    const mid = () => 'm' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
    account.messages.push({ id: mid(), ts: nowIso, mode, courseId: null, role: 'ai', text: replyText, trans: aiTrans, teaching: parsed.teaching_point || '', speakLang, nudge: true });
    if (account.messages.length > 600) account.messages.splice(0, account.messages.length - 600);
    account.credits = Math.round(((account.credits || 0) - CHAT_COST) * 100) / 100;
    saveDB();
    res.json({ reply: replyText, translation: aiTrans, teaching_point: parsed.teaching_point || '', speakLang, credits: account.credits });
  } catch (e) {
    console.error('Nudge error:', e.message);
    res.status(500).json({ error: 'AI failed' });
  }
});

// 长期记忆：每隔若干轮，用旧摘要+最近对话滚动生成一份学生画像摘要
async function maybeUpdateMemory(u) {
  u.memory.turns = (u.memory.turns || 0) + 1;
  if (u.memory.turns % 6 !== 0) return;
  try {
    const recent = (u.history || []).slice(-12).map(m => (m.role === 'user' ? '学生' : 'AI老师') + ': ' + m.content).join('\n');
    const sys = '你是语言学习App的记忆助手。根据"旧记忆"和"最近对话"，更新一段对该学生的长期记忆，供AI老师个性化教学。用中文提炼：称呼/国籍/母语与正在学的语言/当前水平/学习目标/兴趣爱好/性格/反复出错的点/重要的个人事实（如工作、家庭、行程）。只输出摘要正文，不超过150字，不要分点标题、不要寒暄。';
    const out = await callArk([
      { role: 'system', content: sys },
      { role: 'user', content: '【旧记忆】\n' + (u.memory.summary || '（暂无）') + '\n\n【最近对话】\n' + recent }
    ]);
    u.memory.summary = String(out || '').replace(/^["']|["']$/g, '').trim().slice(0, 500);
    u.memory.updatedAt = new Date().toISOString();
    saveDB();
  } catch (e) { /* 记忆更新失败不影响主流程 */ }
}

// ============ 对话历史 & 学习进度 ============
// 拉取当前用户的可回看对话（可按模式/课程过滤），进入对话页时恢复"聊到哪了"
app.get('/api/history', async (req, res) => {
  const u = authUser(req);
  if (!u) return res.status(401).json({ error: 'not_logged_in' });
  const mode = req.query.mode;
  const courseId = req.query.course || null;
  let list = u.messages || [];
  if (mode) list = list.filter(m => m.mode === mode && (!courseId || m.courseId === courseId));
  list = list.slice(-100);
  // 懒补译：仅当用户有积分时才做（避免无积分用户触发翻译成本）
  if ((u.credits || 0) >= MIN_CREDITS) try {
    const nat = u.nativeLang || 'en';
    const tgt = u.targetLang || 'zh';
    const groups = new Map();
    list.forEach(m => {
      const text = String(m.text || '').trim();
      if (!text || (m.trans && String(m.trans).trim())) return;
      const isAi = m.role === 'ai';
      const from = isAi ? (m.speakLang || tgt) : nat;
      const to = isAi ? nat : (m.speakLang || tgt);
      if (from === to) { m.trans = text; return; }
      const key = (isAi ? 'ai' : 'u') + '|' + from + '|' + to;
      if (!groups.has(key)) groups.set(key, { from, to, items: [] });
      groups.get(key).items.push(m);
    });
    let changed = false;
    for (const g of groups.values()) {
      // 补译是锦上添花，绝不能阻塞历史加载：8 秒未返回就先展示原文，下次刷新再补
      const outs = await Promise.race([
        batchTranslateTo(g.items.map(m => String(m.text || '').trim()), g.from, g.to),
        new Promise(resolve => setTimeout(() => resolve(null), 8000))
      ]);
      if (Array.isArray(outs)) g.items.forEach((m, i) => { if (outs[i] && outs[i] !== m.trans) { m.trans = outs[i]; changed = true; } });
    }
    if (changed) saveDB();
  } catch (e) { console.error('history backfill:', e.message); }
  res.json({ history: list, memory: u.memory ? u.memory.summary : '' });
});

// 清空当前模式/课程的对话（重新开始）
app.post('/api/history/clear', (req, res) => {
  const u = authUser(req);
  if (!u) return res.status(401).json({ error: 'not_logged_in' });
  const mode = req.body.mode;
  const courseId = req.body.course || null;
  if (mode) {
    u.messages = (u.messages || []).filter(m => !(m.mode === mode && (!courseId || m.courseId === courseId)));
    if (mode === 'course' && courseId) delete u.courseHistories[courseId];
    if (mode === 'chat') u.history = [];
  } else {
    u.messages = []; u.history = []; u.courseHistories = {};
  }
  saveDB();
  res.json({ ok: true });
});

// 学习进度查询
app.get('/api/progress', (req, res) => {
  const u = authUser(req);
  if (!u) return res.status(401).json({ error: 'not_logged_in' });
  res.json({ progress: u.progress || {}, brief: progressBrief(u), memory: u.memory ? u.memory.summary : '' });
});

// 课程完成上报（练习页交卷）：累计 XP、记录最佳成绩、连续天数
app.post('/api/progress', (req, res) => {
  const u = requireActive(req, res);
  if (!u) return;
  const courseId = String(req.body.courseId || '');
  const score = parseInt(req.body.score, 10) || 0;
  const total = parseInt(req.body.total, 10) || 0;
  const title = String(req.body.title || '');
  if (!courseId) return res.status(400).json({ error: 'bad_course' });
  const p = u.progress;
  const prev = p.completed[courseId];
  const isFirst = !prev;
  const gained = isFirst ? 20 + score * 6 : Math.max(0, (score - (prev.score || 0)) * 6); // 首次完成基础分+每题分，重复只补增量
  p.xp = (p.xp || 0) + gained;
  p.completed[courseId] = {
    score, total, title,
    best: prev ? Math.max(prev.best || 0, score) : score,
    times: prev ? (prev.times || 1) + 1 : 1,
    lastAt: new Date().toISOString()
  };
  bumpStreak(p);
  saveDB();
  res.json({ ok: true, gained, xp: p.xp, completed: p.completed[courseId], brief: progressBrief(u) });
});

// ============ ASR 语音识别（火山引擎 录音文件识别2.0 极速接口） ============
// 浏览器 MediaRecorder 常产出 webm/opus、ogg、mp4，火山对这些容器支持不一；
// 统一用 ffmpeg 转成 16kHz 单声道 PCM WAV（火山必支持，识别率最高）。转码失败再回退原格式。
// 注意：Windows 下 spawn + shell + stdin 管道喂 ffmpeg 会死锁挂起、堆积进程；
// 这里改用 execFile（不经 shell）+ 临时文件，并带 8 秒超时强制 kill，绝不无限挂起。
const FFMPEG_BIN = process.env.FFMPEG_PATH || (process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
function transcodeToWav(inputBuf) {
  return new Promise((resolve, reject) => {
    const id = crypto.randomBytes(6).toString('hex');
    const inFile = path.join(os.tmpdir(), 'asr_in_' + id + '.bin');
    const outFile = path.join(os.tmpdir(), 'asr_out_' + id + '.wav');
    const cleanup = () => { fs.promises.unlink(inFile).catch(() => {}); fs.promises.unlink(outFile).catch(() => {}); };
    fs.writeFile(inFile, inputBuf, (werr) => {
      if (werr) return reject(werr);
      let settled = false;
      const child = execFile(FFMPEG_BIN,
        ['-hide_banner', '-loglevel', 'error', '-y', '-i', inFile, '-ar', '16000', '-ac', '1', '-f', 'wav', outFile],
        { timeout: 8000, windowsHide: true, maxBuffer: 1024 * 1024 },
        (err) => {
          if (settled) return;
          if (err) { settled = true; cleanup(); return reject(new Error('ffmpeg ' + (err.message || '').slice(-160))); }
          fs.readFile(outFile, (rerr, data) => {
            settled = true; cleanup();
            if (rerr) return reject(rerr);
            if (!data || data.length <= 44) return reject(new Error('empty wav'));
            resolve(data);
          });
        });
      child.on('error', (e) => { if (!settled) { settled = true; cleanup(); reject(e); } });
    });
  });
}
function callVolcASR(audioBuf, format, res) {
  if (audioBuf.length < 100) { return res.json({ text: '', error: 'audio too short' }); }
  const taskId = crypto.randomUUID();
  const audioField = { data: audioBuf.toString('base64') };
  if (format) audioField.format = format;
  const body = JSON.stringify({
    user: { uid: '1755661765' },
    audio: audioField,
    request: { model_name: 'bigmodel' }
  });
  const volcReq = https.request({
    hostname: 'openspeech.bytedance.com',
    path: '/api/v3/auc/bigmodel/recognize/flash',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'X-Api-Key': '0c859faf-caff-448f-a444-aa54d7cb573b',
      'X-Api-Resource-Id': 'volc.seedasr.auc',
      'X-Api-Request-Id': taskId,
      'X-Api-Sequence': '-1'
    }
  }, (volcRes) => {
    const vChunks = [];
    volcRes.on('data', (c) => vChunks.push(c));
    volcRes.on('end', () => {
      if (res.headersSent) return;
      const buf = Buffer.concat(vChunks);
      try {
        const j = JSON.parse(buf.toString());
        const text = j.result && j.result.text ? j.result.text : '';
        res.json({ text: text, code: volcRes.headers['x-api-status-code'] });
      } catch(e) {
        res.json({ text: '', error: 'parse failed', raw: buf.toString().substring(0,300) });
      }
    });
  });
  volcReq.on('error', (e) => { console.error('[asr] volc error', e.message); if (!res.headersSent) res.status(500).json({ error: e.message }); });
  volcReq.setTimeout(15000, () => { console.error('[asr] volc TIMEOUT'); try { volcReq.destroy(); } catch (e) {} if (!res.headersSent) res.status(504).json({ error: 'asr timeout' }); });
  volcReq.end(body);
}

app.post('/api/asr', costLimiter, async (req, res) => {
  const _u = requireActive(req, res);
  if (!_u) return;
  const ct = req.headers['content-type'] || '';
  let format = 'ogg';
  if (ct.includes('mp3') || ct.includes('mpeg')) format = 'mp3';
  else if (ct.includes('wav')) format = 'wav';
  else if (ct.includes('webm')) format = 'webm';
  else if (ct.includes('ogg') || ct.includes('opus')) format = 'ogg';
  else if (ct.includes('mp4') || ct.includes('m4a') || ct.includes('aac')) format = 'mp4';
  const sendRaw = (buf) => callVolcASR(buf, format, res);
  // express.raw 已解析二进制 body
  let input = null;
  if (Buffer.isBuffer(req.body) && req.body.length > 0) input = req.body;
  if (!input) {
    // 兜底：手动读流
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => handleBuf(Buffer.concat(chunks)));
  } else {
    handleBuf(input);
  }
  async function handleBuf(buf) {
    if (buf.length < 100) return res.json({ text: '', error: 'audio too short' });
    try {
      const wav = await transcodeToWav(buf);   // 统一转 16k 单声道 wav
      return callVolcASR(wav, 'wav', res);
    } catch (e) {
      console.error('[asr] transcode failed, fallback raw:', e.message);
      return sendRaw(buf);                      // 没装 ffmpeg 等情况：回退原格式直传
    }
  }
});

app.listen(PORT, () => console.log('AI Tutor on http://localhost:' + PORT));
