const WebSocket = require('ws');
const crypto = require('crypto');

// Edge TTS v2 正确连接
function getSecMsGec() {
  const trustedToken = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
  const ticks = Math.floor(Date.now() / 10000 / 60) * 60;
  const str = ticks + trustedToken;
  const hash = crypto.createHash('sha256').update(str).digest('hex');
  return hash.toUpperCase();
}

const TRUSTED_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const GEC = getSecMsGec();
const GEC_VER = '1-131.0.2985.22';

const url = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v2?TrustedClientToken=${TRUSTED_TOKEN}&Sec-MS-GEC=${GEC}&Sec-MS-GEC-Version=${GEC_VER}`;

console.log('Connecting:', url);

const ws = new WebSocket(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold'
  }
});

ws.on('open', function() {
  console.log('CONNECTED!');
  // 发送config
  const config = JSON.stringify({
    context: {
      synthesis: {
        audio: {
          metadataoptions: { sentenceBoundaryEnabled: 'false', wordBoundaryEnabled: 'false' },
          outputFormat: 'audio-24khz-48kbitrate-mono-mp3'
        }
      }
    }
  });
  const configMsg = "X-Timestamp:" + new Date().toISOString() + "\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n" + config;
  ws.send(configMsg);

  // 发送SSML
  const ssml = "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><voice name='en-US-GuyNeural'>Hey beautiful, how are you today?</voice></speak>";
  const ssmlMsg = "X-RequestId:" + Date.now() + "\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:" + new Date().toISOString() + "Z\r\nPath:ssml\r\n\r\n" + ssml;
  ws.send(ssmlMsg);
});

let audioChunks = [];
ws.on('message', function(data, isBinary) {
  if (!isBinary) {
    const s = data.toString();
    console.log('TEXT:', s.substring(0, 200));
    if (s.includes('Path:turn.end')) {
      const buf = Buffer.concat(audioChunks);
      require('fs').writeFileSync('test-male.mp3', buf);
      console.log('Saved male mp3:', buf.length, 'bytes');
      ws.close();
      process.exit(0);
    }
  } else {
    const headerLen = data.readUInt16BE(0);
    const audioData = data.slice(2 + headerLen);
    if (audioData.length > 0) audioChunks.push(audioData);
  }
});

ws.on('error', function(e) { console.log('ERROR:', e.message); });
ws.on('close', function(c) { console.log('CLOSED:', c); process.exit(0); });
setTimeout(function(){ console.log('timeout'); process.exit(1); }, 10000);
