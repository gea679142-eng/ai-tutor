const base = 'http://localhost:3000';
async function req(method, p, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const r = await fetch(base + p, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let j = null; try { j = await r.json(); } catch (e) {}
  return { status: r.status, j };
}
const han = s => (String(s || '').match(/[一-鿿]/g) || []).length;
let pass = 0, fail = 0;
const ok = (n, c, ex) => { console.log((c ? 'PASS ' : 'FAIL ') + n + (ex ? ' :: ' + ex : '')); c ? pass++ : fail++; };
const ts = Date.now();
const cases = [
  { nat: 'th', msg: 'สวัสดีค่ะ วันนี้อากาศดีไหม' },
  { nat: 'ar', msg: 'مرحبا، أين المطعم؟' },
  { nat: 'ja', msg: 'こんにちは、トイレはどこですか？' }
];
(async () => {
  for (const c of cases) {
    const email = `l3_${c.nat}_${ts}@example.com`;
    const reg = await req('POST', '/api/auth/register', { email, password: 'test123456', nativeLang: c.nat, targetLang: 'zh' });
    const token = reg.j.token;
    await req('POST', '/api/order/direct', { plan: 'month', currency: 'USD', reqId: 'l3-' + c.nat + ts }, token);
    const r = await req('POST', '/api/chat', { mode: 'chat', nativeLang: c.nat, targetLang: 'zh', character: 'female', message: c.msg }, token);
    const tag = c.nat;
    ok(tag + ' speak=zh', r.j.speakLang === 'zh', r.j.speakLang);
    ok(tag + ' AI说中文 han>=4', han(r.j.reply) >= 4, 'han=' + han(r.j.reply) + ' :: ' + String(r.j.reply).slice(0, 24));
    ok(tag + ' 母语字幕存在且非中文堆砌', !!r.j.translation && r.j.translation !== r.j.reply, String(r.j.translation).slice(0, 26));
    ok(tag + ' 用户话译成中文 han>=2', han(r.j.user_translation) >= 2, String(r.j.user_translation).slice(0, 20));
  }
  console.log('\n==== ' + pass + ' passed, ' + fail + ' failed ====');
  process.exit(fail ? 1 : 0);
})();
