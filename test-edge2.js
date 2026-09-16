const { EdgeTTS } = require('edge-tts');

async function test() {
  const tts = new EdgeTTS();
  // 试女声
  try {
    await tts.synthesize('你好，很高兴认识你', 'zh-CN-XiaoxiaoNeural', 'test-female.mp3');
    console.log('Female OK');
  } catch(e) { console.log('Female error:', e.message); }
  // 试男声
  try {
    await tts.synthesize('你好，很高兴认识你', 'zh-CN-YunxiNeural', 'test-male.mp3');
    console.log('Male OK');
  } catch(e) { console.log('Male error:', e.message); }
}
test();
