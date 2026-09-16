const https = require('https');
const fs = require('fs');
const path = require('path');
const KEY = '0c859faf-caff-448f-a444-aa54d7cb573b';
const outDir = path.join(__dirname, 'public', 'voice-samples');
fs.mkdirSync(outDir, { recursive: true });

const ZH = '宝贝，今天辛苦啦。来，慢慢跟我读一句：我好想你。';
const EN = "Hey baby, you've worked hard today. Now slowly repeat after me: I really miss you.";

const candidates = [
  // 中文低沉/温柔/骚柔向
  { f: 'zh_1_shenyeboke', sp: 'zh_male_shenyeboke_uranus_bigtts', txt: ZH },
  { f: 'zh_2_diyuwenrou', sp: 'en_male_diyuwenrounan_uranus_bigtts', txt: ZH },
  { f: 'zh_3_aojiaobazong', sp: 'zh_male_aojiaobazong_uranus_bigtts', txt: ZH },
  { f: 'zh_4_xiaoshu', sp: 'zh_male_yuanboxiaoshu_uranus_bigtts', txt: ZH },
  { f: 'zh_5_wenrouxiaoge', sp: 'zh_male_wenrouxiaoge_uranus_bigtts', txt: ZH },
  { f: 'zh_6_yizhipiannan', sp: 'zh_male_yizhipiannan_uranus_bigtts', txt: ZH },
  // 英文低沉/温柔向
  { f: 'en_1_diyuwenrou', sp: 'en_male_diyuwenrounan_uranus_bigtts', txt: EN },
  { f: 'en_2_valentino', sp: 'en_male_valentino_uranus_bigtts', txt: EN },
  { f: 'en_3_hades', sp: 'en_male_hades_uranus_bigtts', txt: EN },
  { f: 'en_4_josh', sp: 'en_male_josh_uranus_bigtts', txt: EN }
];

function synth(speaker, text) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ req_params: { text, speaker, audio_params: { format: 'mp3', sample_rate: 24000 } } });
    const req = https.request({
      hostname: 'openspeech.bytedance.com', path: '/api/v3/tts/unidirectional', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': KEY, 'X-Api-Resource-Id': 'seed-tts-2.0', 'Content-Length': Buffer.byteLength(body) }
    }, (r) => {
      const ch = [];
      r.on('data', c => ch.push(c));
      r.on('end', () => {
        const buf = Buffer.concat(ch);
        const s = buf.toString();
        let b64 = '';
        const re = /"data":"([^"]+)"/g; let m;
        while ((m = re.exec(s)) !== null) b64 += m[1];
        if (b64.length > 100) return resolve({ ok: true, bytes: Buffer.from(b64, 'base64').length });
        let msg = s.slice(0, 160);
        try { const j = JSON.parse(s); msg = JSON.stringify({ code: j.code, message: j.message }); } catch (e) {}
        resolve({ ok: false, msg });
      });
    });
    req.on('error', e => resolve({ ok: false, msg: e.message }));
    req.setTimeout(20000, () => { req.destroy(); resolve({ ok: false, msg: 'timeout' }); });
    req.write(body); req.end();
  });
}

(async () => {
  for (const c of candidates) {
    const r = await synth(c.sp, c.txt);
    if (r.ok) {
      // 重新合成并保存（上面只取了字节数，这里直接在 synth 里没返回 buffer，改为再请求一次保存）
    }
    console.log((r.ok ? 'OK   ' : 'FAIL ') + c.f + '  ' + c.sp + (r.ok ? '  bytes=' + r.bytes : '  :: ' + r.msg));
  }
  // 第二轮：把成功的真正落盘（为省事先全部重新合成并保存）
  for (const c of candidates) {
    await new Promise((resolve) => {
      const body = JSON.stringify({ req_params: { text: c.txt, speaker: c.sp, audio_params: { format: 'mp3', sample_rate: 24000 } } });
      const req = https.request({
        hostname: 'openspeech.bytedance.com', path: '/api/v3/tts/unidirectional', method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': KEY, 'X-Api-Resource-Id': 'seed-tts-2.0', 'Content-Length': Buffer.byteLength(body) }
      }, (r) => {
        const ch = []; r.on('data', x => ch.push(x));
        r.on('end', () => {
          const s = Buffer.concat(ch).toString(); let b64 = ''; const re = /"data":"([^"]+)"/g; let m;
          while ((m = re.exec(s)) !== null) b64 += m[1];
          if (b64.length > 100) fs.writeFileSync(path.join(outDir, c.f + '.mp3'), Buffer.from(b64, 'base64'));
          resolve();
        });
      });
      req.on('error', () => resolve()); req.setTimeout(20000, () => { req.destroy(); resolve(); });
      req.write(body); req.end();
    });
  }
  const files = fs.readdirSync(outDir).filter(f => f.endsWith('.mp3'));
  console.log('\nSAVED ' + files.length + ' samples:');
  files.forEach(f => console.log('  ' + f + '  ' + fs.statSync(path.join(outDir, f)).size + ' bytes'));
})();
