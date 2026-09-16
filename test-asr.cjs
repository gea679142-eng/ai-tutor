const base = 'http://localhost:3000';
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

function ff(args, inputBuf) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', 'pipe:0', ...args, 'pipe:1'], { windowsHide: true, shell: process.platform === 'win32' });
    const out = [], err = [];
    p.stdout.on('data', d => out.push(d)); p.stderr.on('data', d => err.push(d));
    p.on('close', c => c === 0 ? resolve(Buffer.concat(out)) : reject(new Error(Buffer.concat(err).toString().slice(-160))));
    p.stdin.end(inputBuf);
  });
}
(async () => {
  const login = await (await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'e2e_ja_1789502560@example.com', password: 'test123456' }) })).json();
  const token = login.token;
  console.log('login ok, active=', login.user.subscription.active);
  const phrase = '你好，我想学中文，今天天气怎么样';
  const turl = base + '/api/tts?text=' + encodeURIComponent(phrase) + '&character=female&lang=zh&token=' + token;
  const mp3 = Buffer.from(await (await fetch(turl)).arrayBuffer());
  console.log('tts mp3 bytes=', mp3.length);
  const variants = [
    { name: 'webm/opus', buf: await ff(['-c:a', 'libopus', '-b:a', '24k', '-ar', '16000', '-ac', '1', '-f', 'webm'], mp3), ct: 'audio/webm;codecs=opus' },
    { name: 'ogg/opus', buf: await ff(['-c:a', 'libopus', '-b:a', '24k', '-ar', '16000', '-ac', '1', '-f', 'ogg'], mp3), ct: 'audio/ogg;codecs=opus' },
    { name: 'mp4/aac', buf: await ff(['-c:a', 'aac', '-b:a', '32k', '-ar', '16000', '-ac', '1', '-movflags', 'frag_keyframe+empty_moov+default_base_moof', '-f', 'mp4'], mp3), ct: 'audio/mp4' },
  ];
  for (const v of variants) {
    const r = await fetch(base + '/api/asr', { method: 'POST', headers: { 'Content-Type': v.ct, 'Authorization': 'Bearer ' + token }, body: v.buf });
    const j = await r.json();
    console.log(`\n[${v.name}] bytes=${v.buf.length} status=${r.status} code=${j.code}`);
    console.log('  recognized:', JSON.stringify(j.text), j.error ? ('ERR ' + j.error) : '');
  }
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
