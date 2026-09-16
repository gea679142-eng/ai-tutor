const https = require('https');

// 试ark的audio/speech
const TOKEN = 'GTJ-w-p8u6IChNcXGpR_51ufcGu6q97Q';
const APP_KEY = 'krVh2W1_jjHJGpj-H6iViJL2-edOsdQ2';

// 试不同组合
const combos = [
  { url: 'https://openspeech.bytedance.com/api/v1/tts', auth: 'Bearer;' + APP_KEY, appid: APP_KEY, token: TOKEN },
  { url: 'https://openspeech.bytedance.com/api/v1/tts', auth: 'Bearer;' + TOKEN, appid: TOKEN, token: APP_KEY },
];

let i = 0;
function tryNext() {
  if (i >= combos.length) { console.log('All failed'); return; }
  const c = combos[i++];

  const body = JSON.stringify({
    app: { appid: c.appid, token: c.token, cluster: 'volcano_tts' },
    user: { uid: 'test' },
    audio: { voice_type: 'zh_female_vv_uranus_bigtts', encoding: 'mp3' },
    request: { reqid: 'req_' + Date.now(), text: '你好', text_type: 'plain', operation: 'query' }
  });

  const u = new URL(c.url);
  const req = https.request({
    hostname: u.hostname, path: u.pathname, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': c.auth }
  }, (res) => {
    let data = '';
    res.on('data', (ch) => data += ch);
    res.on('end', () => {
      let code='', msg='';
      try { const j=JSON.parse(data); code=j.code; msg=j.message; } catch(e) {}
      console.log(`combo${i} -> ${res.statusCode} code=${code} msg=${msg.substring(0,150)}`);
      tryNext();
    });
  });
  req.write(body);
  req.end();
}
tryNext();
