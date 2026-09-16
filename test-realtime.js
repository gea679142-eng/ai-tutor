const WebSocket = require('ws');

// 试所有组合
const combos = [
  { appId: 'GTJ-w-p8u6IChNcXGpR_51ufcGu6q97Q', key: 'krVh2W1_jjHJGpj-H6iViJL2-edOsdQ2', appKey: 'PlgvMymc7f3tQnJ6' },
  { appId: 'krVh2W1_jjHJGpj-H6iViJL2-edOsdQ2', key: 'GTJ-w-p8u6IChNcXGpR_51ufcGu6q97Q', appKey: 'PlgvMymc7f3tQnJ6' },
  { appId: 'GTJ-w-p8u6IChNcXGpR_51ufcGu6q97Q', key: 'krVh2W1_jjHJGpj-H6iViJL2-edOsdQ2', appKey: 'krVh2W1_jjHJGpj-H6iViJL2-edOsdQ2' },
  { appId: 'krVh2W1_jjHJGpj-H6iViJL2-edOsdQ2', key: 'GTJ-w-p8u6IChNcXGpR_51ufcGu6q97Q', appKey: 'GTJ-w-p8u6IChNcXGpR_51ufcGu6q97Q' },
];

let i = 0;
function tryNext() {
  if (i >= combos.length) { console.log('All failed'); return; }
  const c = combos[i++];
  console.log(`Try combo ${i}: appId=${c.appId.substring(0,8)}...`);

  const ws = new WebSocket('wss://openspeech.bytedance.com/api/v3/realtime/dialogue', {
    headers: {
      'X-Api-App-ID': c.appId,
      'X-Api-Access-Key': c.key,
      'X-Api-Resource-Id': 'volc.speech.dialog',
      'X-Api-App-Key': c.appKey
    }
  });

  ws.on('open', function() {
    console.log('  SUCCESS! Connected!');
    ws.close();
    process.exit(0);
  });
  ws.on('error', function(e) {
    console.log('  Failed:', e.message);
    tryNext();
  });
}
tryNext();
