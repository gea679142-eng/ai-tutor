// 全语种双语翻译矩阵 + 完整用户旅程（注册→付费墙→开通→对话→历史→进度→兑换→登出）
const base = 'http://localhost:3000';
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function req(method, p, body, token, raw) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    if (String(token).startsWith('ADMIN:')) headers['X-Admin-Key'] = token.slice(6);
    else headers.Authorization = 'Bearer ' + token;
  }
  const r = await fetch(base + p, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (raw) return { status: r.status };
  let j = null; try { j = await r.json(); } catch (e) {}
  return { status: r.status, j };
}
const han = s => (String(s || '').match(/[一-鿿]/g) || []).length;
const latinWords = s => (String(s || '').match(/[A-Za-z]+/g) || []).length;
const kana = s => (String(s || '').match(/[぀-ヿ]/g) || []).length;
const hangul = s => (String(s || '').match(/[가-힣]/g) || []).length;
const arabic = s => (String(s || '').match(/[؀-ۿ]/g) || []).length;
const thai = s => (String(s || '').match(/[฀-๿]/g) || []).length;
const cyr = s => (String(s || '').match(/[Ѐ-ӿ]/g) || []).length;
const deva = s => (String(s || '').match(/[ऀ-ॿ]/g) || []).length;

let pass = 0, fail = 0; const fails = [];
function ok(n, c, ex) { console.log((c ? 'PASS ' : 'FAIL ') + n + (ex ? ' :: ' + ex : '')); if (c) pass++; else { fail++; fails.push(n + (ex ? ' :: ' + ex : '')); } }

// 各母语一句日常话（用于"用户用母语发言"）
const UTTER = {
  zh: '你好，我今天有点累', en: 'Hello, I am a bit tired today', ja: 'こんにちは、今日は少し疲れました',
  ko: '안녕하세요, 오늘 조금 피곤해요', es: 'Hola, hoy estoy un poco cansado', pt: 'Olá, hoje estou um pouco cansado',
  id: 'Halo, saya agak lelah hari ini', th: 'สวัสดีครับ วันนี้ผมเหนื่อยนิดหน่อย', fr: "Bonjour, je suis un peu fatigué aujourd'hui",
  de: 'Hallo, ich bin heute etwas müde', ru: 'Привет, я сегодня немного устал', ar: 'مرحبا، أنا متعب قليلا اليوم',
  vi: 'Xin chào, hôm nay tôi hơi mệt', it: "Ciao, oggi sono un po' stanco", tr: 'Merhaba, bugün biraz yorgunum',
  hi: 'नमस्ते, आज मैं थोड़ा थका हुआ हूँ', ms: 'Helo, saya agak penat hari ini', fil: 'Kumusta, medyo pagod ako ngayon'
};
const NATIVE_ALL = ['zh','en','ja','ko','es','pt','id','th','fr','de','ru','ar','vi','it','tr','hi','ms','fil'];
// 非拉丁母语：学中文/英文时，母语字幕必须出现该文字体系
function nativeScriptOk(code, trans) {
  switch (code) {
    case 'ja': return kana(trans) >= 1;                 // 日文译文需含假名，与中文区分
    case 'ko': return hangul(trans) >= 2;
    case 'ar': return arabic(trans) >= 2;
    case 'th': return thai(trans) >= 2;
    case 'ru': return cyr(trans) >= 2;
    case 'hi': return deva(trans) >= 2;
    default: return String(trans || '').trim().length >= 1; // 拉丁字母母语：非空即可
  }
}

async function signup(native, target) {
  const ts = Date.now() + Math.floor(Math.random() * 1e6);
  const reg = await req('POST', '/api/auth/register', { email: `fj_${native}_${target}_${ts}@example.com`, password: 'test123456', nativeLang: native, targetLang: target });
  return reg;
}

async function matrixForTarget(target) {
  // 学 zh：全部18母语；学 en：排除 en 本身（同语言前端拦截），抽11个覆盖各文字体系
  const natives = target === 'zh' ? NATIVE_ALL : ['zh','ja','ko','es','pt','fr','de','ru','ar','th','id'];
  for (const nat of natives) {
    const tag = `[${nat}→${target}]`;
    const reg = await signup(nat, target);
    if (reg.status !== 200) { ok(tag + ' 注册', false, reg.status); await sleep(2200); continue; }
    const token = reg.j.token;
    const d = await req('POST', '/api/order/direct', { plan: 'month', currency: 'USD', reqId: 'fj-' + nat + '-' + target + '-' + Date.now() }, token);
    if (d.status !== 200) { ok(tag + ' 开通', false, d.status); await sleep(2200); continue; }
    const op = await req('POST', '/api/chat/opener', { mode: 'chat', nativeLang: nat, targetLang: target, character: 'female' }, token);
    if (target === 'zh') {
      ok(tag + ' opener说中文', op.j && op.j.speakLang === 'zh' && han(op.j.reply) >= 3, `speak=${op.j && op.j.speakLang} han=${han(op.j && op.j.reply)}`);
      ok(tag + ' opener母语字幕', op.j && nativeScriptOk(nat, op.j.translation), String(op.j && op.j.translation).slice(0, 18));
    } else {
      ok(tag + ' opener说英文', op.j && op.j.speakLang === 'en' && latinWords(op.j.reply) >= 2 && han(op.j.reply) === 0, `speak=${op.j && op.j.speakLang} han=${han(op.j && op.j.reply)} :: ${String(op.j && op.j.reply).slice(0, 30)}`);
      ok(tag + ' opener母语字幕', op.j && nativeScriptOk(nat, op.j.translation), String(op.j && op.j.translation).slice(0, 18));
    }
    const r = await req('POST', '/api/chat', { mode: 'chat', nativeLang: nat, targetLang: target, character: 'female', message: UTTER[nat] }, token);
    if (target === 'zh') {
      ok(tag + ' 对话说中文', r.j && r.j.speakLang === 'zh' && han(r.j.reply) >= 3, 'han=' + han(r.j && r.j.reply));
      ok(tag + ' 对话母语字幕', r.j && nativeScriptOk(nat, r.j.translation), String(r.j && r.j.translation).slice(0, 18));
      ok(tag + ' 用户话译中文', r.j && han(r.j.user_translation) >= 1, String(r.j && r.j.user_translation).slice(0, 16));
    } else {
      ok(tag + ' 对话说英文无汉字', r.j && r.j.speakLang === 'en' && latinWords(r.j.reply) >= 2 && han(r.j.reply) === 0, 'han=' + han(r.j && r.j.reply) + ' :: ' + String(r.j && r.j.reply).slice(0, 30));
      ok(tag + ' 对话母语字幕', r.j && nativeScriptOk(nat, r.j.translation), String(r.j && r.j.translation).slice(0, 18));
      ok(tag + ' 用户话译英文', r.j && latinWords(r.j.user_translation) >= 2 && han(r.j.user_translation) === 0, String(r.j && r.j.user_translation).slice(0, 16));
    }
    await sleep(1600); // 规避 auth/cost 限流
  }
}

async function journey() {
  console.log('\n===== 完整用户旅程 =====');
  const ts = Date.now();
  const email = `journey_${ts}@example.com`;
  let r = await req('POST', '/api/auth/register', { email, password: 'test123456', nativeLang: 'en', targetLang: 'zh' });
  ok('旅程·注册成功', r.status === 200 && !!r.j.token, r.status);
  const token = r.j.token;
  let me = await req('GET', '/api/auth/me', null, token);
  ok('旅程·me身份', me.status === 200 && me.j.user.email === email, me.status);
  let paywall = await req('POST', '/api/chat', { mode: 'chat', nativeLang: 'en', targetLang: 'zh', character: 'female', message: 'hi' }, token);
  ok('旅程·未订阅对话被拦(402)', paywall.status === 402, paywall.status);
  let tts = await req('GET', '/api/tts?text=hi&char=female&lang=zh', null, token, true);
  ok('旅程·未订阅TTS被拦(402)', tts.status === 402, tts.status);
  const wk = await req('POST', '/api/order/direct', { plan: 'week', currency: 'USD', reqId: 'journey-w-' + ts }, token);
  ok('旅程·开通周卡', wk.status === 200 && wk.j.user.subscription.active === true, wk.status);
  me = await req('GET', '/api/auth/me', null, token);
  const daysAfterWeek = me.j.user.subscription.daysLeft;
  ok('旅程·周卡≈7天', daysAfterWeek >= 6 && daysAfterWeek <= 8, daysAfterWeek + ' days');
  const op = await req('POST', '/api/chat/opener', { mode: 'chat', nativeLang: 'en', targetLang: 'zh', character: 'male' }, token);
  ok('旅程·开场中文+英字幕', op.j && op.j.speakLang === 'zh' && !!op.j.translation, op.j && op.j.speakLang);
  const c1 = await req('POST', '/api/chat', { mode: 'chat', nativeLang: 'en', targetLang: 'zh', character: 'male', message: 'Hello, what is your name?' }, token);
  ok('旅程·对话双语', c1.j && han(c1.j.reply) >= 2 && !!c1.j.translation && han(c1.j.user_translation) >= 1, '');
  const hist = await req('GET', '/api/history?mode=chat', null, token);
  ok('旅程·历史已记录(>=2条)', hist.j && hist.j.history.length >= 2, hist.j && hist.j.history.length);
  const prog = await req('POST', '/api/progress', { courseId: 'b1', score: 8, total: 10, title: '你好' }, token);
  ok('旅程·进度上报', prog.status === 200, prog.status);
  // 兑换码：管理员生成月卡，用户兑换，验证时长在周卡基础上叠加到≈37天
  const gen = await req('POST', '/api/admin/codes/generate', { type: 'month', count: 1 }, 'ADMIN:master888');
  function adminOk(g){ return g.status === 200 && g.j.created && g.j.created.length === 1; }
  if (adminOk(gen)) {
    const code = gen.j.created[0];
    const rm = await req('POST', '/api/redeem', { code }, token);
    ok('旅程·兑换月卡成功', rm.status === 200 && rm.j.plan === 'month', rm.status);
    const again = await req('POST', '/api/redeem', { code }, token);
    ok('旅程·兑换码不可重复使用(409)', again.status === 409, again.status);
    me = await req('GET', '/api/auth/me', null, token);
    const dl = me.j.user.subscription.daysLeft;
    ok('旅程·周+月叠加≈37天', dl >= 35 && dl <= 38, dl + ' days');
  } else {
    ok('旅程·管理员生成兑换码', false, 'admin gen status=' + gen.status + ' ' + JSON.stringify(gen.j));
  }
  await req('POST', '/api/auth/logout', null, token);
  const after = await req('GET', '/api/auth/me', null, token);
  ok('旅程·登出后旧token失效(401)', after.status === 401, after.status);
}

(async () => {
  console.log('===== 学中文（18种母语）双语矩阵 =====');
  await matrixForTarget('zh');
  console.log('\n===== 学英文（11种母语）双语矩阵 =====');
  await matrixForTarget('en');
  await journey();
  console.log('\n############ 结果: ' + pass + ' passed, ' + fail + ' failed ############');
  if (fail) { console.log('失败项:\n - ' + fails.join('\n - ')); }
  process.exit(fail ? 1 : 0);
})();
