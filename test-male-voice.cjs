const base = 'http://localhost:3000';
async function req(method, p, body, token, raw) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const r = await fetch(base + p, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (raw) return { status: r.status, type: r.headers.get('content-type'), bytes: (await r.arrayBuffer()).byteLength };
  let j = null; try { j = await r.json(); } catch (e) {}
  return { status: r.status, j };
}
let pass = 0, fail = 0;
const ok = (n, c, ex) => { console.log((c ? 'PASS ' : 'FAIL ') + n + (ex ? ' :: ' + ex : '')); c ? pass++ : fail++; };
(async () => {
  const ts = Date.now();
  // 中文母语学英文，男老师
  const reg = await req('POST', '/api/auth/register', { email: `mv_${ts}@example.com`, password: 'test123456', nativeLang: 'zh', targetLang: 'en' });
  const token = reg.j.token;
  await req('POST', '/api/order/direct', { plan: 'month', currency: 'USD', reqId: 'mv-' + ts }, token);

  // 1) 男老师 TTS：中文音色、英文音色都应返回音频
  const tz = await req('GET', '/api/tts?text=' + encodeURIComponent('宝贝，今天累不累，让我陪你说说话。') + '&char=male&lang=zh', null, token, true);
  ok('男·中文TTS音频', tz.status === 200 && /audio/.test(tz.type) && tz.bytes > 5000, tz.status + ' ' + tz.type + ' ' + tz.bytes + 'B');
  const te = await req('GET', '/api/tts?text=' + encodeURIComponent('Hey baby, come a little closer and talk with me.') + '&char=male&lang=en', null, token, true);
  ok('男·英文TTS音频', te.status === 200 && /audio/.test(te.type) && te.bytes > 5000, te.status + ' ' + te.type + ' ' + te.bytes + 'B');
  const tf = await req('GET', '/api/tts?text=' + encodeURIComponent('你好呀，亲爱的。') + '&char=female&lang=zh', null, token, true);
  ok('女·中文TTS仍正常', tf.status === 200 && /audio/.test(tf.type), tf.status + ' ' + tf.bytes + 'B');

  // 2) 对话克制：连续3轮，统计长度与问号数
  const ci = null;
  const says = ['你好', '我今天有点累', ''];
  for (let i = 0; i < 2; i++) {
    const r = await req('POST', '/api/chat', { mode: 'chat', nativeLang: 'zh', targetLang: 'en', character: 'male', message: says[i] }, token);
    const reply = r.j.reply || '';
    const qmarks = (reply.match(/[?？]/g) || []).length;
    const words = reply.split(/\s+/).filter(Boolean).length;
    console.log(`  R${i + 1}(${words}词,?${qmarks}): ${reply}`);
    ok(`R${i + 1}说英文`, /[A-Za-z]/.test(reply) && !/[一-鿿]/.test(reply), '');
    ok(`R${i + 1}简短(<=28词)`, words <= 28, words + ' words');
    ok(`R${i + 1}最多1个问句`, qmarks <= 1, qmarks + ' ?');
    ok(`R${i + 1}带中文字幕`, !!r.j.translation && /[一-鿿]/.test(r.j.translation), String(r.j.translation).slice(0, 20));
  }
  console.log('\n==== ' + pass + ' passed, ' + fail + ' failed ====');
  process.exit(fail ? 1 : 0);
})();
