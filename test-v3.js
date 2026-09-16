const https = require('https');
const fs = require('fs');

const KEYS = ['GTJ-w-p8u6IChNcXGpR_51ufcGu6q97Q', 'krVh2W1_jjHJGpj-H6iViJL2-edOsdQ2'];

let idx = 0;
function tryKey() {
  if (idx >= KEYS.length) { console.log('All failed'); return; }
  const apiKey = KEYS[idx++];
  
  const body = JSON.stringify({
    req_params: {
      text: "你好，很高兴认识你",
      speaker: "zh_female_gaolengyujie_uranus_bigtts",
      audio_params: { format: "mp3", sample_rate: 24000 }
    }
  });

  const req = https.request({
    hostname: 'openspeech.bytedance.com',
    path: '/api/v3/tts/unidirectional',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
      'X-Api-Resource-Id': 'seed-tts-2.0'
    }
  }, (res) => {
    console.log(`Key ${apiKey.substring(0,10)}... status=${res.statusCode}`);
    let data = [];
    res.on('data', (chunk) => data.push(chunk));
    res.on('end', () => {
      const buf = Buffer.concat(data);
      console.log(`  Response: ${buf.length} bytes`);
      try {
        const j = JSON.parse(buf.toString());
        console.log(`  JSON: code=${j.code} message=${(j.message||'').substring(0,100)}`);
        if (j.data) {
          fs.writeFileSync('volc-test.mp3', Buffer.from(j.data, 'base64'));
          console.log('  SUCCESS! Saved volc-test.mp3');
        }
      } catch(e) {
        if (buf.length > 1000) {
          fs.writeFileSync('volc-test.mp3', buf);
          console.log('  Saved as binary audio!');
        } else {
          console.log(`  Body: ${buf.toString().substring(0,200)}`);
        }
      }
      tryKey();
    });
  });
  req.write(body);
  req.end();
}
tryKey();
