// 本轮新增能力回归：安全防护 + 套餐直接开通（去 whop）
const BASE = 'http://localhost:3000';
const ADMIN = process.env.ADMIN_KEY || 'master888';
let pass = 0, fail = 0;
function ok(name, cond) { console.log((cond ? 'PASS  ' : 'FAIL  ') + name); cond ? pass++ : fail++; }
async function j(p, opts) {
  const r = await fetch(BASE + p, opts);
  let b = null; try { b = await r.json(); } catch (e) {}
  return { status: r.status, headers: r, body: b };
}
(async () => {
  // 1) 安全响应头
  const r0 = await fetch(BASE + '/login.html');
  ok('安全头 X-Content-Type-Options=nosniff', r0.headers.get('x-content-type-options') === 'nosniff');
  ok('安全头 X-Frame-Options=SAMEORIGIN', r0.headers.get('x-frame-options') === 'SAMEORIGIN');
  ok('限流头 X-RateLimit-Limit 存在', !!r0.headers.get('x-ratelimit-limit'));

  const ts = Date.now();
  const email = 'sec_' + ts + '@example.com';
  // 2) 注册 + 原型污染清洗（带 __proto__）
  let r = await j('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'test123456', nativeLang: 'ja', __proto__: { polluted: 'YES' } }) });
  ok('注册成功并返回 token', r.status === 200 && !!r.body.token);
  ok('原型污染已清洗，({}).polluted 为 undefined', ({}).polluted === undefined);
  ok('注册母语 ja 正确保存', r.body.user.nativeLang === 'ja');
  const token = r.body.token;
  const H = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };

  // 3) 偏好枚举白名单
  let p = await j('/api/user/profile', { method: 'POST', headers: H, body: JSON.stringify({ nativeLang: 'ko', targetLang: 'en', character: 'male' }) });
  ok('合法偏好更新 ko/en/male', p.status === 200 && p.body.user.nativeLang === 'ko' && p.body.user.targetLang === 'en' && p.body.user.character === 'male');
  p = await j('/api/user/profile', { method: 'POST', headers: H, body: JSON.stringify({ nativeLang: 'hacker', character: 'robot', targetLang: 'klingon' }) });
  ok('非法枚举被拒绝，保持 ko/male/en', p.status === 200 && p.body.user.nativeLang === 'ko' && p.body.user.character === 'male' && p.body.user.targetLang === 'en');

  // 4) 开通前未激活
  let me = await j('/api/auth/me', { headers: H });
  ok('direct 开通前订阅未激活', me.body.user.subscription.active === false);

  // 5) direct 直接开通
  const reqId = 'req' + ts;
  let d = await j('/api/order/direct', { method: 'POST', headers: H, body: JSON.stringify({ plan: 'week', currency: 'USD', reqId }) });
  ok('direct 开通周卡成功且 active/plan 正确', d.status === 200 && d.body.user.subscription.active === true && d.body.user.subscription.plan === 'week');
  const until1 = d.body.user.subscription.until;

  // 6) 同 reqId 幂等，不叠加时长
  let d2 = await j('/api/order/direct', { method: 'POST', headers: H, body: JSON.stringify({ plan: 'week', currency: 'USD', reqId }) });
  ok('同 reqId 返回 duplicate 且到期时间不叠加', d2.status === 200 && d2.body.duplicate === true && d2.body.user.subscription.until === until1);

  // 7) 非法套餐 400
  let d3 = await j('/api/order/direct', { method: 'POST', headers: H, body: JSON.stringify({ plan: 'year', reqId: 'x' + ts }) });
  ok('非法 plan 返回 400', d3.status === 400);

  // 8) 后台订单联动：direct 已支付单可见
  let ad = await j('/api/admin/users', { headers: { 'x-admin-key': ADMIN } });
  const mine = (ad.body.orders || []).filter(o => o.email === email);
  ok('后台可见 direct 已支付订单(无 pending)', mine.length >= 1 && mine.every(o => o.status === 'paid' && o.channel === 'direct'));

  // 9) chat 入参校验
  let c0 = await j('/api/chat', { method: 'POST', headers: H, body: JSON.stringify({ message: '   ', mode: 'chat' }) });
  ok('chat 空消息返回 400', c0.status === 400);

  // 10) 登录防爆破：持续错误登录最终 429
  let got429 = false;
  for (let i = 0; i < 16; i++) {
    const rr = await j('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'nobody' + i + '@x.com', password: 'wrongpw' }) });
    if (rr.status === 429) { got429 = true; break; }
  }
  ok('登录爆破触发限流 429', got429);

  console.log(`\n==== 结果: ${pass} passed, ${fail} failed ====`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
