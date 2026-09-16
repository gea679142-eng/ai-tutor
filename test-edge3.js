const crypto = require('crypto');
const WebSocket = require('ws');
const fs = require('fs');

function getGecToken() {
  // Sec-MS-GEC token algorithm
  const str = crypto.randomBytes(16).toString('hex');
  const time = Math.floor(Date.now() / 1000);
  const hash = crypto.createHash('sha256').update(str + time + '654321').digest('hex');
  return hash.toUpperCase();
}

async function tts(text, voice, filename) {
  const token = getGecToken();
  const url = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v2?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4&Sec-MS-GEC=${token}&Sec-MS-GEC-Version=1-135.0.3179.98`;

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 Edg/135.0.0.0',
        'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold'
      }
    });

    let audioChunks = [];
    let gotConfig = false;

    ws.on('open', () => {
      // Send config
      const config = {
        context: {
          synthesis: {
            audio: {
              metadataoptions: { sentenceBoundaryEnabled: 'false', wordBoundaryEnabled: 'false' },
              outputFormat: 'audio-24khz-48kbitrate-mono-mp3'
            }
          }
        }
      };
      ws.send(JSON.stringify(config));

      // Send SSML
      const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='zh-CN'><voice name='${voice}'>${text}</voice></speak>`;
      const reqId = crypto.randomBytes(16).toString('hex');
      const msg = `X-RequestId:${reqId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${new Date().toUTCString()}\r\n\r\n${ssml}`;
      ws.send(msg);
    });

    ws.on('message', (data) => {
      const str = data.toString();
      if (str.includes('Path:turn.start')) {
        gotConfig = true;
      }
      if (str.includes('Path:audio')) {
        // Binary audio data after headers
        const idx = str.indexOf('Path:audio');
        const headerEnd = str.indexOf('\r\n\r\n', idx);
        if (headerEnd >= 0) {
          const audioPart = data.slice(Buffer.byteLength(str.substring(0, headerEnd + 4)));
          audioChunks.push(audioPart);
        }
      }
      if (str.includes('Path:turn.end')) {
        const audio = Buffer.concat(audioChunks);
        fs.writeFileSync(filename, audio);
        console.log(`Saved ${filename}: ${audio.length} bytes`);
        ws.close();
        resolve();
      }
    });

    ws.on('error', (e) => {
      console.log('WS error:', e.message);
      reject(e);
    });

    setTimeout(() => { ws.close(); reject(new Error('timeout')); }, 10000);
  });
}

(async () => {
  try {
    await tts('你好，很高兴认识你，今天过得怎么样？', 'zh-CN-XiaoxiaoNeural', 'edge-female.mp3');
    await tts('你好，很高兴认识你，今天过得怎么样？', 'zh-CN-YunxiNeural', 'edge-male.mp3');
  } catch(e) {
    console.log('Failed:', e.message);
  }
})();
