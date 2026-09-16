const base = 'http://localhost:3000';
async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const r = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let j = null; try { j = await r.json(); } catch (e) {}
  return { status: r.status, j };
}
const cjk = s => (s.match(/[一-鿿]/g) || []).length;
const latin = s => (s.match(/[a-zA-ZÀ-ÿ]/g) || []).length;
const count = (s, re) => (s.match(re) || []).length;
const checks = {
  ar: s => count(s, /[؀-ۿ]/g) > 3,
  ko: s => count(s, /[가-힯]/g) > 3,
  fr: s => latin(s) > 5 && cjk(s) === 0,
  ru: s => count(s, /[Ѐ-ӿ]/g) > 3,
};
const langs = ['ar', 'ko', 'fr', 'ru'];
(async () => {
  let pass = 0, fail = 0;
  const ok = (n, c, x) => { console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' :: ' + x : '')); c ? pass++ : fail++; };
  for (const lng of langs) {
    const ts = Date.now() + Math.floor(Math.random() * 1000);
    const email = `lang_${lng}_${ts}@example.com`;
    const reg = await req('POST', '/api/auth/register', { email, password: 'test123456', nativeLang: lng, targetLang: 'zh' });
    const token = reg.j.token;
    await req('POST', '/api/order/direct', { plan: 'month', currency: 'USD', reqId: 'lang-' + lng + '-' + ts }, token);
    // 自由聊天 opener：学中文 => AI 说中文，字幕母语
    const o = await req('POST', '/api/chat/opener', { mode: 'chat', nativeLang: lng, targetLang: 'zh', character: 'female', teacherId: 'f_real' }, token);
    const reply = o.j.reply || '', trans = o.j.translation || '';
    ok(`[${lng}] free speakLang=zh`, o.j.speakLang === 'zh', o.j.speakLang);
    ok(`[${lng}] free reply Chinese-dominant`, cjk(reply) >= 4 && latin(reply) < cjk(reply), reply.slice(0, 40));
    ok(`[${lng}] subtitle in native`, checks[lng](trans), trans.slice(0, 40));
    // 课程 opener：锁定中文
    const c = await req('POST', '/api/chat/opener', { mode: 'course', cat: 'beginner', course: 'b1', courseInfo: { course: { id: 'b1', title: '你好' } }, nativeLang: lng, targetLang: 'zh', character: 'female', teacherId: 'f_real' }, token);
    const creply = c.j.reply || '';
    ok(`[${lng}] course speakLang=zh`, c.j.speakLang === 'zh', c.j.speakLang);
    ok(`[${lng}] course reply Chinese`, cjk(creply) >= 4, creply.slice(0, 40));
    console.log('');
  }
  console.log(`SUMMARY pass=${pass} fail=${fail}`, fail === 0 ? 'ALL PASS' : 'HAS FAIL');
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
