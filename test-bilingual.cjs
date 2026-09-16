const base = 'http://localhost:3000';
const fs = require('fs');
const path = require('path');
async function req(method, p, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const r = await fetch(base + p, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let j = null; try { j = await r.json(); } catch (e) {}
  return { status: r.status, j };
}
const han = s => (String(s || '').match(/[一-鿿]/g) || []).length;
const lat = s => (String(s || '').match(/[A-Za-z]/g) || []).length;
let pass = 0, fail = 0;
const ok = (n, c, ex) => { console.log((c ? 'PASS ' : 'FAIL ') + n + (ex ? ' :: ' + ex : '')); c ? pass++ : fail++; };
const ts = Date.now();

async function signup(native, target) {
  const email = `bil_${native}_${target}_${ts}@example.com`;
  const reg = await req('POST', '/api/auth/register', { email, password: 'test123456', nativeLang: native, targetLang: target });
  const token = reg.j.token;
  await req('POST', '/api/order/direct', { plan: 'month', currency: 'USD', reqId: 'bil-' + native + target + ts }, token);
  return { token, email };
}

(async () => {
  // ===== 方向1：母语中文，学英文（AI 必须说英文 + 中文字幕；用户中文→英文译文）=====
  console.log('--- 方向1: native=zh learn=en ---');
  const a = await signup('zh', 'en');
  const op = await req('POST', '/api/chat/opener', { mode: 'chat', nativeLang: 'zh', targetLang: 'en', character: 'female' }, a.token);
  ok('opener speak=en', op.j.speakLang === 'en', op.j.speakLang);
  ok('opener AI说英文(汉字少)', han(op.j.reply) <= 2, 'han=' + han(op.j.reply) + ' :: ' + String(op.j.reply).slice(0, 40));
  ok('opener 中文字幕非空且为中文', !!op.j.translation && han(op.j.translation) >= 2, String(op.j.translation).slice(0, 30));

  const msgs = ['你是做什么的', '我今天有点累', '你喜欢吃什么'];
  for (let i = 0; i < msgs.length; i++) {
    const r = await req('POST', '/api/chat', { mode: 'chat', nativeLang: 'zh', targetLang: 'en', character: 'female', message: msgs[i] }, a.token);
    const tag = 'r' + (i + 1);
    ok(tag + ' http200', r.status === 200, 'st=' + r.status);
    ok(tag + ' AI说英文(speak=en)', r.j.speakLang === 'en', r.j.speakLang);
    ok(tag + ' AI台词以英文为主', han(r.j.reply) <= 3 && lat(r.j.reply) >= 6, 'han=' + han(r.j.reply) + ' lat=' + lat(r.j.reply) + ' :: ' + String(r.j.reply).slice(0, 36));
    ok(tag + ' 中文字幕存在', !!r.j.translation && String(r.j.translation).trim() && han(r.j.translation) >= 1, String(r.j.translation).slice(0, 28));
    ok(tag + ' 用户话译成英文', !!r.j.user_translation && han(r.j.user_translation) <= 2 && lat(r.j.user_translation) >= 3, String(r.j.user_translation).slice(0, 28));
  }

  // ===== 方向2：母语英文，学中文（AI 说中文 + 英文字幕；用户英文→中文译文）=====
  console.log('--- 方向2: native=en learn=zh ---');
  const b = await signup('en', 'zh');
  const msgs2 = ['How old are you?', 'I want to order food'];
  for (let i = 0; i < msgs2.length; i++) {
    const r = await req('POST', '/api/chat', { mode: 'chat', nativeLang: 'en', targetLang: 'zh', character: 'male', message: msgs2[i] }, b.token);
    const tag = 'z' + (i + 1);
    ok(tag + ' AI说中文(speak=zh)', r.j.speakLang === 'zh' && han(r.j.reply) >= 4, 'han=' + han(r.j.reply) + ' :: ' + String(r.j.reply).slice(0, 30));
    ok(tag + ' 英文字幕存在(汉字少)', !!r.j.translation && han(r.j.translation) <= 2 && lat(r.j.translation) >= 4, String(r.j.translation).slice(0, 28));
    ok(tag + ' 用户话译成中文', !!r.j.user_translation && han(r.j.user_translation) >= 2, String(r.j.user_translation).slice(0, 24));
  }

  // ===== 历史补译：扫描库里是否存在 AI 空字幕旧记录，登录后 GET history 应自动补齐 =====
  console.log('--- 历史空字幕自动补译 ---');
  try {
    const db = JSON.parse(fs.readFileSync(path.join(__dirname, 'db.json'), 'utf8'));
    const users = Array.isArray(db.users) ? db.users : Object.values(db.users || {});
    const victim = users.find(u => u.email && Array.isArray(u.messages) &&
      u.messages.some(m => m.role === 'ai' && !(m.trans && String(m.trans).trim())));
    if (!victim) { console.log('NOTE 无含空AI字幕的旧账号，跳过补译验证'); }
    else {
      const lg = await req('POST', '/api/auth/login', { email: victim.email, password: 'test123456' });
      if (lg.status !== 200 || !lg.j.token) { console.log('NOTE 旧账号无法登录(密码未知)，跳过 :: ' + victim.email); }
      else {
        const before = victim.messages.filter(m => m.role === 'ai' && !(m.trans && String(m.trans).trim())).length;
        const h = await req('GET', '/api/history', null, lg.j.token);
        const aiMsgs = (h.j.history || []).filter(m => m.role === 'ai');
        const stillEmpty = aiMsgs.filter(m => !(m.trans && String(m.trans).trim())).length;
        ok('旧空字幕已补译(补前' + before + ' 补后空=' + stillEmpty + ')', stillEmpty === 0, 'aiMsgs=' + aiMsgs.length);
      }
    }
  } catch (e) { console.log('NOTE 补译扫描异常: ' + e.message); }

  console.log('\n==== 结果: ' + pass + ' passed, ' + fail + ' failed ====');
  process.exit(fail ? 1 : 0);
})();
