const base = 'http://localhost:3000';
async function post(path, body, token) {
  const r = await fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: JSON.stringify(body)
  });
  let j = null; try { j = await r.json(); } catch (e) {}
  return { status: r.status, j };
}
const hasCJK = s => /[一-鿿]/.test(s || '');
const hasLatin = s => /[a-zA-Z]/.test(s || '');
(async () => {
  let r = await post('/api/auth/login', { email: 'e2e_de_1789498891@example.com', password: 'test123456' });
  const token = r.j && r.j.token;
  if (!token) { console.log('login fail', r.status, r.j); process.exit(1); }
  console.log('logged in native=', r.j.user.nativeLang, 'target=', r.j.user.targetLang, 'char=', r.j.user.character);
  const cr = await fetch(base + '/api/course/seasia/seasia1', { headers: { Authorization: 'Bearer ' + token } });
  const cd = await cr.json();

  let o = await post('/api/chat/opener', { mode: 'course', courseInfo: cd, nativeLang: r.j.user.nativeLang, targetLang: r.j.user.targetLang, character: r.j.user.character }, token);
  console.log('\n[COURSE opener] status', o.status, 'speakLang=', o.j && o.j.speakLang, 'hasCJK=', hasCJK(o.j && o.j.reply));
  console.log(' reply=', o.j && o.j.reply);
  const courseOk = o.j && o.j.speakLang === 'zh' && hasCJK(o.j.reply);
  console.log(' COURSE LOCK ZH:', courseOk ? 'PASS' : 'FAIL');

  let n = await post('/api/chat/nudge', { mode: 'chat', nativeLang: r.j.user.nativeLang, targetLang: r.j.user.targetLang, character: r.j.user.character }, token);
  console.log('\n[NUDGE chat] status', n.status, 'speakLang=', n.j && n.j.speakLang);
  console.log(' reply=', n.j && n.j.reply);
  const nudgeOk = n.status === 200 && n.j && n.j.speakLang === 'en' && hasLatin(n.j.reply);
  console.log(' NUDGE EN:', nudgeOk ? 'PASS' : 'FAIL');

  let n2 = await post('/api/chat/nudge', { mode: 'chat', nativeLang: 'zh', targetLang: 'en', character: 'female' }, token);
  console.log('\n[NUDGE rapid] status', n2.status, '(expect 429)', n2.status === 429 ? 'PASS' : 'FAIL');

  console.log('\nSUMMARY', (courseOk && nudgeOk && n2.status === 429) ? 'ALL PASS' : 'HAS FAIL');
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
