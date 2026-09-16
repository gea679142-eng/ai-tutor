const base = 'http://localhost:3000';
async function post(path, body, token) {
  const r = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body) });
  let j = null; try { j = await r.json(); } catch (e) {}
  return { status: r.status, j };
}
const latinRatio = s => { if (!s) return 0; const letters = (s.match(/[a-zA-Z]/g) || []).length; const cjk = (s.match(/[一-鿿]/g) || []).length; return letters + cjk === 0 ? 0 : letters / (letters + cjk); };
(async () => {
  const r = await post('/api/auth/login', { email: 'e2e_de_1789498891@example.com', password: 'test123456' });
  const token = r.j.token;
  for (const mode of ['treehole', 'chat']) {
    // 清历史后开场，避免历史污染
    await post('/api/history/clear', { mode }, token);
    const o = await post('/api/chat/opener', { mode, nativeLang: 'zh', targetLang: 'en', character: 'female' }, token);
    const rep = o.j && o.j.reply || '';
    console.log(`\n[${mode}] speakLang=${o.j && o.j.speakLang} latinRatio=${latinRatio(rep).toFixed(2)}`);
    console.log(' reply=', rep);
    console.log(' trans=', o.j && o.j.translation);
    console.log(' tp=', o.j && o.j.teaching_point);
  }
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
