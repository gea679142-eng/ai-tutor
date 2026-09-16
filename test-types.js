const https = require('https');
const fs = require('fs');

function testType(type) {
  return new Promise((resolve) => {
    https.get(`https://dict.youdao.com/dictvoice?audio=Hello%20how%20are%20you&type=${type}`, (res) => {
      let size = 0;
      res.on('data', (c) => size += c.length);
      res.on('end', () => { console.log(`type=${type}: ${size} bytes`); resolve(); });
    }).on('error', () => { console.log(`type=${type}: error`); resolve(); });
  });
}

(async () => {
  for (let i = 1; i <= 10; i++) {
    await testType(i);
  }
})();
