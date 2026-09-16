const fs = require('fs');
const TOK = fs.readFileSync('tok.txt', 'utf8').trim();
const langs = ['es','pt','id','th','vi','it','tr','hi','ms','fil'];
(async () => {
  for (const l of langs) {
    try {
      const r = await fetch('http://localhost:3000/api/chat/opener', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOK },
        body: JSON.stringify({ mode: 'chat', nativeLang: l, targetLang: 'zh', character: 'female' })
      });
      const j = await r.json();
      const reply = j.reply || '', trans = j.translation || '';
      const han = (reply.match(/[一-鿿]/g) || []).length;
      const transHan = (trans.match(/[一-鿿]/g) || []).length;
      const ok = (r.status === 200 && j.speakLang === 'zh' && han >= 2 && trans.length > 2 && (l === 'zh' || transHan < han));
      console.log((ok ? 'PASS ' : 'CHECK') + ' ' + l + ' http' + r.status + ' speak=' + j.speakLang + ' replyHan=' + han + ' transHan=' + transHan + ' | ' + reply.slice(0, 24) + ' => ' + trans.slice(0, 22));
    } catch (e) { console.log('FAIL ' + l + ' ' + e.message); }
  }
})();
