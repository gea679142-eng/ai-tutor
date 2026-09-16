const https = require('https');
const fs = require('fs');

// 用户给的两个key
const TOKEN1 = 'GTJ-w-p8u6IChNcXGpR_51ufcGu6q97Q';
const TOKEN2 = 'krVh2W1_jjHJGpj-H6iViJL2-edOsdQ2';

// 试所有组合
const combos = [
  { appid: TOKEN1, token: TOKEN2, cluster: 'volcano_tts' },
  { appid: TOKEN2, token: TOKEN1, cluster: 'volcano_tts' },
  { appid: TOKEN1, token: TOKEN2, cluster: 'volcano_icl_tts' },
  { appid: TOKEN2, token: TOKEN1, cluster: 'volcano_icl_tts' },
];

let i = 0;
function tryNext() {
  if (i >= combos.length) { console.log('All failed'); return; }
  const c = combos[i++];

  const body = JSON.stringify({
    app: { appid: c.appid, token: c.token, cluster: c.cluster },
    user: { uid: 'test' },
    audio: { voice_type: 'zh_female_vv', encoding: 'mp3' },
    request: { reqid: 'req_' + Date.now(), text: '你好', text_type: 'plain', operation: 'query' }
  });

  const req = https.request({
    hostname: 'openspeech.bytedance.com',
    path: '/api/v1/tts',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer;' + c.token }
  }, (res) => {
    let data = [];
    res.on('data', (chunk) => data.push(chunk));
    res.on('end', () => {
      const buf = Buffer.concat(data);
      let code = '', msg = '';
      try { const j = JSON.parse(buf.toString()); code = j.code; msg = j.message; if (j.data) { fs.writeFileSync('volc-tts.mp3', Buffer.from(j.data, 'base64')); console.log('SUCCESS! Saved volc-tts.mp3'); process.exit(0); } } catch(e) {}
      console.log(`appid=${c.appid.substring(0,8)}... cluster=${c.cluster} -> code=${code} msg=${msg.substring(0,100)}`);
      tryNext();
    });
  });
  req.write(body);
  req.end();
}
tryNext();
