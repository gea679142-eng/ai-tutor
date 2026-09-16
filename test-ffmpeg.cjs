const { execFile } = require('child_process');
const path = require('path');
const bin = process.env.FFMPEG_PATH || (process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
const t0 = Date.now();
const child = execFile(bin,
  ['-hide_banner','-loglevel','error','-y','-i','say.mp3','-ar','16000','-ac','1','-f','wav','test_out.wav'],
  { timeout: 8000, windowsHide: true },
  (err, stdout, stderr) => {
    console.log('elapsed ms=', Date.now() - t0);
    if (err) { console.log('ERROR:', err.message); return; }
    const fs = require('fs');
    console.log('wav bytes=', fs.statSync('test_out.wav').size, 'stderr=', String(stderr).slice(0,120));
  });
child.on('error', e => console.log('CHILD ERROR:', e.message));
