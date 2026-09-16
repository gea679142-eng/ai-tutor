const https = require('https');
const fs = require('fs');

const APPID = '1755661765';
const KEYS = ['GTJ-w-p8u6IChNcXGpR_51ufcGu6q97Q', 'krVh2W1_jjHJGpj-H6iViJL2-edOsdQ2'];

let idx = 0;
function tryKey() {
  if (idx >= KEYS.length) { console.log('All failed'); return; }
  const token = KEYS[idx++];
  
  const body = JSON.stringify({
    app: { appid: APPID, token: token, cluster: 'volcano_tts' },
    user: { uid: 'test' },
    audio: { voice_type: 'zh_female_vv', encoding: 'mp3' },
    request: { reqid: 'req_' + Date.now(), text: '你好，很高兴认识你', text_type: 'plain', operation: 'query' }
  });

  const req = https.request({
    hostname: 'openspeech.bytedance.com',
    path: '/api/v1/tts',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer;' + token }
  }, (res) => {
    let data = [];
    res.on('data', (chunk) => data.push(chunk));
    res.on('end', () => {
      const buf = Buffer.concat(data);
      try {
        const j = JSON.parse(buf.toString());
        console.log(`Key ${token.substring(0,10)}... -> code=${j.code} msg=${(j.message||'').substring(0,80)}`);
        if (j.data) {
          fs.writeFileSync('volc-test.mp3', Buffer.from(j.data, 'base64'));
          console.log('SUCCESS! Saved volc-test.mp3');
          process.exit(0);
        }
      } catch(e) {
        console.log(`Key ${token.substring(0,10)}... -> non-JSON: ${buf.length} bytes`);
        if (buf.length > 1000) {
          fs.writeFileSync('volc-test.mp3', buf);
          console.log('Saved as audio!');
          process.exit(0);
        }
      }
      tryKey();
    });
  });
  req.write(body);
  req.end();
}
tryKey();
