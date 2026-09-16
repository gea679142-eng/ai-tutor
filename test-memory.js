// 历史记录 / 学习进度 / 模式隔离 / 清空 / 长期记忆 验证
const BASE = 'http://localhost:3000';
const ADMIN = 'master888';
let pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('PASS  ' + n); } else { fail++; console.log('FAIL  ' + n + (e ? ' -> ' + JSON.stringify(e) : '')); } }
async function j(m, p, b, tok, adminKey) {
  const h = {};
  if (b) h['Content-Type'] = 'application/json';
  if (tok) h['Authorization'] = 'Bearer ' + tok;
  if (adminKey) h['X-Admin-Key'] = adminKey;
  const r = await fetch(BASE + p, { method: m, headers: h, body: b ? JSON.stringify(b) : undefined });
  let d = null; try { d = await r.json(); } catch (e) {}
  return { status: r.status, data: d };
}
(async () => {
  const email = 'mem_' + Date.now() + '@example.com', pw = 'test123456';
  let r = await j('POST', '/api/auth/register', { email, password: pw, nativeLang: 'zh', targetLang: 'en' });
  const token = r.data.token;

  // 开通周卡
  r = await j('POST', '/api/admin/codes/generate', { type: 'week', count: 1 }, null, ADMIN);
  const code = r.data.created[0];
  await j('POST', '/api/redeem', { code }, token);

  // 1. 初始无历史
  r = await j('GET', '/api/history?mode=chat', null, token);
  ok('初始自由聊天历史为空', Array.isArray(r.data.history) && r.data.history.length === 0, r.data);

  // 2. 自由对话2轮（短消息）
  await j('POST', '/api/chat', { message: '你好', mode: 'chat', nativeLang: 'zh', targetLang: 'en' }, token);
  await j('POST', '/api/chat', { message: '我叫小明', mode: 'chat', nativeLang: 'zh', targetLang: 'en' }, token);
  r = await j('GET', '/api/history?mode=chat', null, token);
  ok('2轮后自由历史有4条且含双语字段', r.data.history.length === 4 && r.data.history[0].text && ('trans' in r.data.history[0]), r.data.history.map(x=>x.role));
  ok('历史按user/ai交替', r.data.history[0].role==='user' && r.data.history[1].role==='ai', r.data.history.map(x=>x.role));

  // 3. 进度：chatCount=2 streak=1
  r = await j('GET', '/api/progress', null, token);
  ok('对话轮次=2 且连续天数=1', r.data.brief.chatCount === 2 && r.data.brief.streakDays === 1, r.data.brief);

  // 4. 课程模式与自由模式隔离
  await j('POST', '/api/chat', { message: 'hello', mode: 'course', courseInfo: { category: '零基础入门', course: { id: 'b1', name: '你好', vocab: ['你好'], scene: '打招呼', goal: '问候' } }, nativeLang: 'zh', targetLang: 'en' }, token);
  r = await j('GET', '/api/history?mode=chat', null, token);
  ok('自由历史仍是4条(课程不串入)', r.data.history.length === 4, r.data.history.length);
  r = await j('GET', '/api/history?mode=course&course=b1', null, token);
  ok('课程b1历史独立有2条', r.data.history.length === 2 && r.data.history[0].courseId === 'b1', r.data.history.map(x=>x.courseId));

  // 5. 课程完成上报：首次得XP
  r = await j('POST', '/api/progress', { courseId: 'b1', score: 8, total: 10, title: '你好' }, token);
  const firstGain = r.data.gained, xp1 = r.data.xp;
  ok('首次完成课程获得XP(20+8*6=68)', firstGain === 68, { firstGain });
  // 再考更高分只补增量
  r = await j('POST', '/api/progress', { courseId: 'b1', score: 10, total: 10, title: '你好' }, token);
  ok('满分重考只补增量(2*6=12)', r.data.gained === 12 && r.data.xp === xp1 + 12, { gain: r.data.gained });
  ok('最佳分更新为10、次数=2', r.data.completed.best === 10 && r.data.completed.times === 2, r.data.completed);

  // 6. 清空自由历史
  await j('POST', '/api/history/clear', { mode: 'chat' }, token);
  r = await j('GET', '/api/history?mode=chat', null, token);
  ok('清空后自由历史为空', r.data.history.length === 0, r.data.history.length);
  r = await j('GET', '/api/history?mode=course&course=b1', null, token);
  ok('清空自由不影响课程历史', r.data.history.length === 2, r.data.history.length);

  // 7. 长期记忆：再补4轮自由对话，累计达到6轮阈值，异步生成摘要
  for (let i = 0; i < 4; i++) {
    await j('POST', '/api/chat', { message: '我喜欢学英语第' + i + '句', mode: 'chat', nativeLang: 'zh', targetLang: 'en' }, token);
  }
  await new Promise(s => setTimeout(s, 4000)); // 等异步记忆总结
  r = await j('GET', '/api/progress', null, token);
  ok('6轮后生成长期记忆摘要(非空)', typeof r.data.memory === 'string' && r.data.memory.length > 0, { mem: String(r.data.memory).slice(0, 80) });

  console.log('\n==== 结果: ' + pass + ' passed, ' + fail + ' failed ====');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(1); });
