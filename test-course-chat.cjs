const base = 'http://localhost:3000';
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
(async () => {
  const ts = Date.now();
  const reg = await req('POST', '/api/auth/register', { email: `cc_${ts}@example.com`, password: 'test123456', nativeLang: 'en', targetLang: 'zh' });
  const token = reg.j.token;
  await req('POST', '/api/order/direct', { plan: 'month', currency: 'USD', reqId: 'cc-' + ts }, token);
  const ci = { course: { id: 'b1', lang: 'zh' } };
  const op = await req('POST', '/api/chat/opener', { mode: 'course', nativeLang: 'en', targetLang: 'zh', character: 'female', courseInfo: ci }, token);
  ok('course opener speak=zh', op.j.speakLang === 'zh', op.j.speakLang);
  ok('course opener 中文台词', han(op.j.reply) >= 3, 'han=' + han(op.j.reply) + ' :: ' + String(op.j.reply).slice(0, 24));
  ok('course opener 英文字幕', !!op.j.translation && lat(op.j.translation) >= 3, String(op.j.translation).slice(0, 28));
  const r = await req('POST', '/api/chat', { mode: 'course', nativeLang: 'en', targetLang: 'zh', character: 'female', courseInfo: ci, message: 'Hello teacher' }, token);
  ok('course chat speak=zh', r.j.speakLang === 'zh' && han(r.j.reply) >= 3, 'han=' + han(r.j.reply));
  ok('course chat 英文字幕非空', !!r.j.translation && lat(r.j.translation) >= 3, String(r.j.translation).slice(0, 28));
  ok('course chat 用户话译中文', han(r.j.user_translation) >= 1, String(r.j.user_translation).slice(0, 20));
  console.log('\n==== ' + pass + ' passed, ' + fail + ' failed ====');
  process.exit(fail ? 1 : 0);
})();
