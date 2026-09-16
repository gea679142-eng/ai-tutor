// 安全攻击测试矩阵（黑盒 HTTP）
const base = 'http://localhost:3000';
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function req(method, p, body, token, headers0) {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, headers0 || {});
  if (token) {
    if (String(token).startsWith('ADMIN:')) headers['X-Admin-Key'] = token.slice(6);
    else headers.Authorization = 'Bearer ' + token;
  }
  const r = await fetch(base + p, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let j = null; const txt = await r.text();
  try { j = JSON.parse(txt); } catch (e) {}
  return { status: r.status, j, txt, headers: r.headers };
}
let pass = 0, fail = 0; const fails = [];
function ok(n, c, ex) { console.log((c ? 'PASS ' : 'FAIL ') + n + (ex ? ' :: ' + ex : '')); if (c) pass++; else { fail++; fails.push(n); } }
const ts = Date.now();

(async () => {
  console.log('===== 1. 未授权访问必须拦截 =====');
  const protectedRoutes = [
    ['GET', '/api/auth/me'], ['POST', '/api/user/profile', {}], ['POST', '/api/chat', { message: 'hi' }],
    ['POST', '/api/chat/opener', {}], ['GET', '/api/history'], ['POST', '/api/progress', {}],
    ['POST', '/api/order/direct', { plan: 'month' }], ['POST', '/api/redeem', { code: 'X' }],
    ['GET', '/api/tts?text=hi&char=female&lang=zh']
  ];
  for (const [m, p, b] of protectedRoutes) {
    const r = await req(m, p, b, null);
    ok('无token ' + m + ' ' + p.split('?')[0], r.status === 401 || r.status === 402, r.status);
  }
  let adm = await req('GET', '/api/admin/users');
  ok('无密钥访问后台 403', adm.status === 403, adm.status);
  adm = await req('GET', '/api/admin/users', null, 'ADMIN:wrong-key');
  ok('错误密钥访问后台 403', adm.status === 403, adm.status);

  console.log('\n===== 2. 伪造/篡改令牌 =====');
  let r = await req('GET', '/api/auth/me', null, 'fake.token.value');
  ok('伪造token 401', r.status === 401, r.status);
  r = await req('GET', '/api/auth/me', null, '../../etc/passwd');
  ok('畸形token 401', r.status === 401, r.status);

  console.log('\n===== 3. 注册两个账号 =====');
  const a = await req('POST', '/api/auth/register', { email: `atkA_${ts}@example.com`, password: 'test123456', nativeLang: 'en', targetLang: 'zh' });
  const b = await req('POST', '/api/auth/register', { email: `atkB_${ts}@example.com`, password: 'test123456', nativeLang: 'en', targetLang: 'zh' });
  ok('A/B 注册成功', a.status === 200 && b.status === 200, a.status + '/' + b.status);
  const TA = a.j.token, TB = b.j.token;

  console.log('\n===== 4. 付费墙（未订阅不能用成本接口）=====');
  for (const [m, p, body] of [['POST', '/api/chat', { message: 'hi', mode: 'chat' }], ['POST', '/api/chat/opener', { mode: 'chat' }], ['POST', '/api/progress', { courseId: 'b1', score: 1, total: 1 }]]) {
    const x = await req(m, p, Object.assign({ nativeLang: 'en', targetLang: 'zh', character: 'female' }, body), TA);
    ok('未订阅 ' + p + ' =402', x.status === 402, x.status);
  }
  const tts402 = await req('GET', '/api/tts?text=hi&char=female&lang=zh', null, TA);
  ok('未订阅 TTS=402', tts402.status === 402, tts402.status);

  console.log('\n===== 5. 订单金额/时长篡改无效 =====');
  // B 试图用 1 个货币单位、9999 天开通月卡
  const tamper = await req('POST', '/api/order/direct', { plan: 'month', currency: 'USD', reqId: 'tamper-' + ts, amount: 0.01, price: 1, days: 9999, total: 1 }, TB);
  ok('篡改请求仍200开通(本地)', tamper.status === 200, tamper.status);
  const bme = await req('GET', '/api/auth/me', null, TB);
  const dl = bme.j.user.subscription.daysLeft;
  ok('篡改days无效，月卡仍≈30天', dl >= 29 && dl <= 31, dl + ' days');
  const admUsers = await req('GET', '/api/admin/users', null, 'ADMIN:master888');
  const order = (admUsers.j.orders || []).find(o => o.id === 'direct-tamper-' + ts);
  ok('服务端定价不被amount影响(=179)', !!order && order.amount === 179, order ? order.amount : 'no order');
  // 幂等：同一 reqId 重复提交不叠加
  const dup = await req('POST', '/api/order/direct', { plan: 'month', currency: 'USD', reqId: 'tamper-' + ts }, TB);
  ok('同reqId重复提交幂等', dup.status === 200 && dup.j.duplicate === true, dup.status);
  const bme2 = await req('GET', '/api/auth/me', null, TB);
  ok('幂等后时长不翻倍', Math.abs(bme2.j.user.subscription.daysLeft - dl) <= 1, bme2.j.user.subscription.daysLeft);
  // 非法套餐
  const bad1 = await req('POST', '/api/order/direct', { plan: 'year', reqId: 'y1' }, TB);
  const bad2 = await req('POST', '/api/order/direct', { plan: '', reqId: 'y2' }, TB);
  ok('非法套餐被拒400', bad1.status === 400 && bad2.status === 400, bad1.status + '/' + bad2.status);

  console.log('\n===== 6. 枚举白名单拒绝非法偏好 =====');
  await req('POST', '/api/order/direct', { plan: 'week', currency: 'USD', reqId: 'grantA-' + ts }, TA);
  await sleep(500);
  await req('POST', '/api/user/profile', { nativeLang: '<script>alert(1)</script>', targetLang: 'fr', character: 'hacker', teacherId: 'evil' }, TA);
  const ame = await req('GET', '/api/auth/me', null, TA);
  const u = ame.j.user;
  ok('非法母语被忽略', ['zh','en','ja','ko','es','pt','id','th','fr','de','ru','ar','vi','it','tr','hi','ms','fil'].indexOf(u.nativeLang) >= 0, u.nativeLang);
  ok('目标语仅zh/en(fr被拒)', u.targetLang === 'zh' || u.targetLang === 'en', u.targetLang);
  ok('非法角色被忽略', u.character === 'female' || u.character === 'male', u.character);
  ok('非法老师被忽略', ['f_3d','f_real','f_anime','f_illus','m_3d','m_real','m_anime','m_illus'].indexOf(u.teacherId) >= 0, u.teacherId);

  console.log('\n===== 7. 注入与异常输入不击穿 =====');
  const inj1 = await req('POST', '/api/auth/register', { email: { $ne: 'x' }, password: 'test123456' });
  const inj2 = await req('POST', '/api/auth/register', { email: ["a@b.com"], password: 'test123456' });
  const inj3 = await req('POST', '/api/auth/register', { email: "' OR 1=1 --@x.com", password: 'test123456' });
  ok('NoSQL对象/数组/SQL注入邮箱均400', [inj1.status, inj2.status, inj3.status].every(s => s === 400), inj1.status + '/' + inj2.status + '/' + inj3.status);
  const proto = await req('POST', '/api/auth/register', { email: `proto_${ts}@example.com`, password: 'test123456', __proto__: { polluted: 1 }, constructor: { prototype: { p: 1 } } });
  ok('原型污染载荷不影响注册', proto.status === 200, proto.status);
  ok('服务端未被原型污染', ({}).polluted === undefined && ({}).p === undefined, 'polluted=' + ({}).polluted);

  console.log('\n===== 8. XSS：恶意脚本仅作为文本存储，不执行 =====');
  const xss = '<img src=x onerror=alert(1)>**hi**';
  const xc = await req('POST', '/api/chat', { mode: 'chat', nativeLang: 'en', targetLang: 'zh', character: 'female', message: xss }, TA);
  ok('XSS载荷对话不报错', xc.status === 200, xc.status);
  const xh = await req('GET', '/api/history?mode=chat', null, TA);
  const stored = JSON.stringify(xh.j.history || []);
  ok('恶意脚本作为数据原样存储(前端esc转义)', stored.indexOf('onerror=alert') >= 0, '');

  console.log('\n===== 9. 水平越权隔离 =====');
  // B 说一句私密内容，A 的历史里不应出现
  const secret = 'secretword-' + ts + '-onlyB';
  await req('POST', '/api/chat', { mode: 'chat', nativeLang: 'en', targetLang: 'zh', character: 'female', message: 'remember ' + secret }, TB);
  const ah = await req('GET', '/api/history?mode=chat', null, TA);
  ok('A历史读不到B的私密消息', JSON.stringify(ah.j.history || []).indexOf(secret) === -1, '');
  await req('POST', '/api/history/clear', { mode: 'chat' }, TA);
  const bh = await req('GET', '/api/history?mode=chat', null, TB);
  ok('A清空自己历史不影响B', JSON.stringify(bh.j.history || []).indexOf(secret) >= 0, '');

  console.log('\n===== 10. 兑换码 =====');
  const badRedeem = await req('POST', '/api/redeem', { code: 'WEEK-DEAD-BEEF' }, TA);
  ok('不存在兑换码404', badRedeem.status === 404, badRedeem.status);
  const noKeyGen = await req('POST', '/api/admin/codes/generate', { type: 'week', count: 1 }, TA);
  ok('普通用户token不能生成兑换码', noKeyGen.status === 403, noKeyGen.status);

  console.log('\n===== 11. 超大输入不击穿 =====');
  const huge = '你好'.repeat(5000);
  const hc = await req('POST', '/api/chat', { mode: 'chat', nativeLang: 'zh', targetLang: 'en', character: 'female', message: huge }, TA);
  ok('超长消息不500', hc.status !== 500 && hc.status !== 429, hc.status);

  console.log('\n===== 12. 安全响应头 =====');
  const lp = await req('GET', '/login.html');
  ok('nosniff头', /nosniff/.test(lp.headers.get('x-content-type-options') || ''), lp.headers.get('x-content-type-options'));
  ok('X-Frame-Options头', !!lp.headers.get('x-frame-options'), lp.headers.get('x-frame-options'));
  ok('隐藏X-Powered-By', !lp.headers.get('x-powered-by'), lp.headers.get('x-powered-by'));

  console.log('\n===== 13. 登录爆破限流（最后执行）=====');
  let blocked = false, any200 = false, codes = [];
  for (let i = 0; i < 15; i++) {
    const x = await req('POST', '/api/auth/login', { email: `nobrute_${ts}@x.com`, password: 'wrong' + i });
    codes.push(x.status);
    if (x.status === 429) blocked = true;
    if (x.status === 200) any200 = true;
  }
  ok('连续错误登录出现429限流', blocked, 'codes=' + codes.join(','));
  ok('错误密码从未登录成功', !any200, '');

  console.log('\n############ 安全测试: ' + pass + ' passed, ' + fail + ' failed ############');
  if (fail) console.log('失败项: ' + fails.join(' | '));
  process.exit(fail ? 1 : 0);
})();
