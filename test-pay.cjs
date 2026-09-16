// 支付资金链路自测：用真实 HMAC 签名模拟 Whop / NOWPayments 回调
const crypto = require('crypto');
const BASE = 'http://localhost:3000';
const WHOP_SECRET = 'ws_testsecret1234567890abcdef';
const NP_SECRET = 'testipnsecret999';
let pass = 0, fail = 0;
function check(name, cond, extra = '') {
  if (cond) { pass++; console.log('PASS', name, extra); }
  else { fail++; console.log('FAIL', name, extra); }
}
function sortObjDeep(o) {
  if (Array.isArray(o)) return o.map(sortObjDeep);
  if (o && typeof o === 'object') return Object.keys(o).sort().reduce((a, k) => { a[k] = sortObjDeep(o[k]); return a; }, {});
  return o;
}
async function main() {
  const email = `pay_whop_${Date.now()}@example.com`;
  // 1) 注册
  let r = await fetch(BASE + '/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'test123456', nativeLang: 'en', targetLang: 'zh', character: 'female' }) });
  let j = await r.json();
  const token = j.token;
  check('注册拿token', !!token);
  const auth = { 'content-type': 'application/json', authorization: 'Bearer ' + token };

  async function me() { const j = await (await fetch(BASE + '/api/auth/me', { headers: auth })).json(); return j.user || j; }
  let before = await me();
  check('注册后未订阅', !before.subscription.active);

  // 2) Whop 合法 payment.succeeded
  const body = { id: 'msg_t1', type: 'payment.succeeded', data: { id: 'pay_t1', amount_after_fees: 49, currency: 'USD', metadata: { email, plan: 'week', order_id: 'whop-order-1' } } };
  const raw = JSON.stringify(body);
  const wid = 'msg_t1', ts = Math.floor(Date.now() / 1000);
  const sig = 'v1,' + crypto.createHmac('sha256', WHOP_SECRET).update(`${wid}.${ts}.${raw}`).digest('base64');
  r = await fetch(BASE + '/api/webhooks/whop', { method: 'POST', headers: { 'content-type': 'application/json', 'webhook-id': wid, 'webhook-timestamp': ts, 'webhook-signature': sig }, body: raw });
  check('Whop合法回调200', r.status === 200, 'status=' + r.status);
  after = await me();
  check('Whop回调后开通week', after.subscription.active && after.subscription.plan === 'week', JSON.stringify(after.subscription));
  const expire1 = after.subscription.expireAt;

  // 3) 重复投递同 webhook-id → 200 且时长不叠加
  r = await fetch(BASE + '/api/webhooks/whop', { method: 'POST', headers: { 'content-type': 'application/json', 'webhook-id': wid, 'webhook-timestamp': ts, 'webhook-signature': sig }, body: raw });
  after = await me();
  check('重复回调不重复加时长', r.status === 200 && after.subscription.expireAt === expire1, 'expire不变');

  // 4) 坏签名
  r = await fetch(BASE + '/api/webhooks/whop', { method: 'POST', headers: { 'content-type': 'application/json', 'webhook-id': 'msg_bad', 'webhook-timestamp': Math.floor(Date.now() / 1000), 'webhook-signature': 'v1,' + crypto.createHmac('sha256', 'wrong').update('x').digest('base64') }, body: raw });
  check('坏签名401', r.status === 401, 'status=' + r.status);

  // 5) 过期时间戳（正确签名）
  const tsOld = Math.floor(Date.now() / 1000) - 400;
  const wid2 = 'msg_old';
  const sigOld = 'v1,' + crypto.createHmac('sha256', WHOP_SECRET).update(`${wid2}.${tsOld}.${raw}`).digest('base64');
  r = await fetch(BASE + '/api/webhooks/whop', { method: 'POST', headers: { 'content-type': 'application/json', 'webhook-id': wid2, 'webhook-timestamp': tsOld, 'webhook-signature': sigOld }, body: raw });
  check('过期时间戳400', r.status === 400, 'status=' + r.status);

  // 6) membership.deactivated 停权
  const deact = { id: 'msg_d1', type: 'membership.deactivated', data: { id: 'mem_x', metadata: { email } } };
  const rawD = JSON.stringify(deact);
  const tsD = Math.floor(Date.now() / 1000);
  const sigD = 'v1,' + crypto.createHmac('sha256', WHOP_SECRET).update(`msg_d1.${tsD}.${rawD}`).digest('base64');
  r = await fetch(BASE + '/api/webhooks/whop', { method: 'POST', headers: { 'content-type': 'application/json', 'webhook-id': 'msg_d1', 'webhook-timestamp': tsD, 'webhook-signature': sigD }, body: rawD });
  check('停权回调200', r.status === 200);
  after = await me();
  check('停权后立即不能用', !after.subscription.active);

  // 7) NOWPayments 坏签名 → 401
  const npBody = { payment_id: 'np1', status: 'finished', order_id: 'np-order-1', price_amount: 49 };
  r = await fetch(BASE + '/api/webhooks/nowpayments', { method: 'POST', headers: { 'content-type': 'application/json', 'x-nowpayments-sig': 'deadbeef' }, body: JSON.stringify(npBody) });
  check('NOWPay坏签名401', r.status === 401, 'status=' + r.status);

  // 8) NOWPayments 合法 finished（order 由 direct 预建以验证验签+fulfill 调用）
  r = await fetch(BASE + '/api/order/direct', { method: 'POST', headers: auth, body: JSON.stringify({ plan: 'month', reqId: 'nppre' }) });
  const dj = await r.json();
  const oid = dj.orderId;
  const npBody2 = { payment_id: 'np2', status: 'finished', order_id: oid, price_amount: 179, price_currency: 'usd' };
  const npSig = crypto.createHmac('sha512', NP_SECRET).update(JSON.stringify(sortObjDeep(npBody2))).digest('hex');
  r = await fetch(BASE + '/api/webhooks/nowpayments', { method: 'POST', headers: { 'content-type': 'application/json', 'x-nowpayments-sig': npSig }, body: JSON.stringify(npBody2) });
  check('NOWPay合法回调200', r.status === 200, 'status=' + r.status);

  // 9) dev 模拟付费（沙箱闭环）
  r = await fetch(BASE + '/api/dev/simulate-paid', { method: 'POST', headers: auth, body: JSON.stringify({ plan: 'week' }) });
  check('沙箱模拟付费200', r.status === 200);
  after = await me();
  check('模拟付费后开通', after.subscription.active);

  console.log(`\n==== pay chain: ${pass} passed, ${fail} failed ====`);
  process.exit(fail ? 1 : 0);
}
main().catch(e => { console.error('FATAL', e); process.exit(2); });
