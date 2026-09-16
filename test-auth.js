// 全链路自测：注册(无试用)→402拦截→管理后台→兑换→叠加→订单幂等→登录→TTS鉴权
const BASE = 'http://localhost:3000';
const ADMIN = 'master888';
let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('PASS  ' + name); }
  else { fail++; console.log('FAIL  ' + name + (extra ? '  -> ' + JSON.stringify(extra) : '')); }
}
async function j(method, path, body, token, adminKey) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = 'Bearer ' + token;
  if (adminKey) headers['X-Admin-Key'] = adminKey;
  const r = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = null;
  try { data = await r.json(); } catch (e) { data = { _status: r.status, _nonJson: true }; }
  return { status: r.status, data };
}
async function adminOrders() {
  const r = await j('GET', '/api/admin/users', null, null, ADMIN);
  return r.data.totalOrders;
}
(async () => {
  const email = 'test_' + Date.now() + '@example.com';
  const pw = 'test123456';

  // 1. 未登录访问受保护接口 -> 401
  let r = await j('POST', '/api/chat', { message: 'hi' });
  ok('未登录访问chat返回401', r.status === 401, r.status);

  // 2. 注册（不再送试用）
  r = await j('POST', '/api/auth/register', { email, password: pw, nativeLang: 'en', targetLang: 'zh' });
  ok('注册成功并返回token', r.status === 200 && r.data.token, r.data);
  const token = r.data.token;
  const sub0 = r.data.user.subscription;
  ok('新注册无试用: active=false 且 plan=none', sub0.active === false && sub0.plan === 'none', sub0);

  // 3. 未订阅调用 chat -> 402
  r = await j('POST', '/api/chat', { message: 'hi' }, token);
  ok('未订阅调用chat返回402', r.status === 402, r.status);

  // 4. 重复注册 -> 409 / 错误密码 -> 401
  r = await j('POST', '/api/auth/register', { email, password: pw });
  ok('重复注册返回409', r.status === 409, r.status);
  r = await j('POST', '/api/auth/login', { email, password: 'wrongpw' });
  ok('错误密码返回401', r.status === 401, r.status);
  r = await j('POST', '/api/auth/login', { email, password: pw });
  ok('正确登录返回token', r.status === 200 && r.data.token, r.status);

  // 5. me
  r = await j('GET', '/api/auth/me', null, token);
  ok('me返回用户', r.status === 200 && r.data.user.email === email, r.data);

  // 6. 管理密钥
  r = await j('POST', '/api/admin/codes/generate', { type: 'week', count: 3 }, null, 'wrong-key');
  ok('错误管理密钥返回403', r.status === 403, r.status);
  r = await j('POST', '/api/admin/codes/generate', { type: 'week', count: 2 }, null, ADMIN);
  ok('生成2个周卡', r.status === 200 && r.data.created.length === 2, r.data);
  const weekCode = r.data.created[0], dupCode = r.data.created[1];
  r = await j('POST', '/api/admin/codes/generate', { type: 'month', count: 1 }, null, ADMIN);
  ok('生成1个月卡', r.status === 200 && r.data.created.length === 1, r.data);
  const monthCode = r.data.created[0];

  // 7. 订单：未支付(create)不落库、不增加后台订单数（用独立账号，避免干扰主兑换叠加）
  const ordEmail = 'ord_' + Date.now() + '@example.com';
  let rr = await j('POST', '/api/auth/register', { email: ordEmail, password: pw });
  const ordToken = rr.data.token;
  const before = await adminOrders();
  r = await j('POST', '/api/order/create', { plan: 'week', channel: 'whop' }, ordToken);
  ok('创建订单返回pending订单号', r.status === 200 && r.data.order && r.data.order.status === 'pending', r.data);
  const oid = r.data.order.id;
  await j('POST', '/api/order/create', { plan: 'month', channel: 'whop' }, ordToken);
  await j('POST', '/api/order/create', { plan: 'week', channel: 'whop' }, ordToken);
  const afterCreate = await adminOrders();
  ok('连续3次未支付下单，后台订单数不增加', afterCreate === before, { before, after: afterCreate });

  // 8. mock-pay 幂等：同一 orderId 两次只开通一次、不叠加
  r = await j('POST', '/api/order/mock-pay', { plan: 'week', orderId: oid }, ordToken);
  ok('首次模拟支付成功并开通周卡', r.status === 200 && r.data.user.subscription.plan === 'week', r.data);
  const until1 = r.data.user.subscription.until;
  r = await j('POST', '/api/order/mock-pay', { plan: 'week', orderId: oid }, ordToken);
  ok('同订单号重复支付返回duplicate且不叠加', r.status === 200 && r.data.duplicate === true && r.data.user.subscription.until === until1, { duplicate: r.data.duplicate });

  // 9. 兑换码
  r = await j('POST', '/api/redeem', { code: 'WEEK-NOPE-NOPE' }, token);
  ok('无效兑换码返回404', r.status === 404, r.status);
  r = await j('POST', '/api/redeem', { code: weekCode }, token);
  ok('兑换周卡成功', r.status === 200 && r.data.user.subscription.plan === 'week', r.data);
  r = await j('POST', '/api/redeem', { code: monthCode }, token);
  const totalDays = (r.data.user.subscription.until - Date.now()) / 86400000;
  ok('再兑月卡叠加≈37天(36.9~37.1)', r.status === 200 && totalDays > 36.9 && totalDays < 37.1, totalDays.toFixed(3));
  r = await j('POST', '/api/redeem', { code: weekCode }, token);
  ok('已用码再次兑换返回409', r.status === 409, r.status);

  // 10. 第二账号兑换未使用码
  const email2 = 'test2_' + Date.now() + '@example.com';
  r = await j('POST', '/api/auth/register', { email: email2, password: pw });
  const token2 = r.data.token;
  r = await j('POST', '/api/redeem', { code: dupCode }, token2);
  ok('第二账号兑换未使用码成功', r.status === 200, r.data);

  // 11. 有效订阅可对话 / TTS
  r = await j('POST', '/api/chat', { message: '你好', mode: 'chat', nativeLang: 'en', targetLang: 'zh' }, token);
  ok('有效订阅调用chat返回200', r.status === 200, r.status);
  const tts = await fetch(BASE + '/api/tts?text=' + encodeURIComponent('你好世界') + '&char=female&lang=zh&token=' + token);
  ok('TTS带token返回200音频', tts.status === 200 && tts.headers.get('content-type').includes('audio'), tts.status);
  const tts2 = await fetch(BASE + '/api/tts?text=hi');
  ok('TTS无token返回401', tts2.status === 401, tts2.status);

  // 12. 后台只显示已支付订单（mock 测试单不计入）
  r = await j('GET', '/api/admin/users', null, null, ADMIN);
  const allPaid = (r.data.orders || []).every(o => o.status === 'paid');
  ok('后台订单全部为paid(无pending/mock)', r.status === 200 && allPaid && r.data.totalUsers >= 2, { total: r.data.totalOrders, allPaid });

  // 13. 登出失效
  r = await j('POST', '/api/auth/logout', null, token);
  r = await j('GET', '/api/auth/me', null, token);
  ok('登出后旧token失效401', r.status === 401, r.status);

  console.log('\n==== 结果: ' + pass + ' passed, ' + fail + ' failed ====');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('TEST CRASH', e); process.exit(1); });
