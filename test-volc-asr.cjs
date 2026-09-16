const https = require('https');
const fs = require('fs');
const crypto = require('crypto');
const wav = fs.readFileSync('test_out.wav');
const body = JSON.stringify({
  user: { uid: '1755661765' },
  audio: { data: wav.toString('base64'), format: 'wav' },
  request: { model_name: 'bigmodel' }
});
const req = https.request({
  hostname: 'openspeech.bytedance.com',
  path: '/api/v3/auc/bigmodel/recognize/flash',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Api-Key': '0c859faf-caff-448f-a444-aa54d7cb573b',
    'X-Api-Resource-Id': 'volc.seedasr.auc',
    'X-Api-Request-Id': crypto.randomUUID(),
    'X-Api-Sequence': '-1',
    'Content-Length': Buffer.byteLength(body)
  }
}, (res) => {
  console.log('HTTP', res.statusCode);
  console.log('x-api-status-code =', res.headers['x-api-status-code']);
  console.log('content-type =', res.headers['content-type']);
  let d = ''; res.on('data', c => d += c);
  res.on('end', () => console.log('BODY:', d.slice(0, 800)));
});
req.on('error', e => console.log('REQ ERROR:', e.message));
req.setTimeout(18000, () => { console.log('>>> VOLC TIMEOUT (no response in 18s)'); req.destroy(); });
req.write(body); req.end();
