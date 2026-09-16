const base = 'http://localhost:3000';
const ADMIN = 'master888';
async function req(method, path, body, token, adminKey) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  if (adminKey) headers['X-Admin-Key'] = adminKey;
  const r = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let j = null; try { j = await r.json(); } catch (e) {}
  return { status: r.status, j };
}
let pass = 0, fail = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? ' :: ' + extra : '')); cond ? pass++ : fail++; };
const ts = Date.now();
(async () => {
  // 1) admin 鉴权
  ok('admin no-key ->403', (await req('GET', '/api/admin/codes')).status === 403);
  ok('admin wrong-key ->403', (await req('GET', '/api/admin/codes', null, null, 'wrong')).status === 403);
  ok('admin right-key ->200', (await req('GET', '/api/admin/codes', null, null, ADMIN)).status === 200);

  // 2) 生成周卡兑换码
  const g = await req('POST', '/api/admin/codes/generate', { type: 'week', count: 1 }, null, ADMIN);
  ok('gen week code', g.status === 200 && g.j.created.length === 1, JSON.stringify(g.j && g.j.created));
  const code = g.j.created[0];

  // 3) 注册新用户（未订阅）
  const email = `adm_${ts}@example.com`;
  const reg = await req('POST', '/api/auth/register', { email, password: 'test123456', nativeLang: 'fr', targetLang: 'zh' });
  const token = reg.j.token;
  ok('register', !!token, 'native fr target zh');
  const me0 = await req('GET', '/api/auth/me', null, token);
  ok('new user inactive', me0.j.user.subscription.active === false);

  // 4) 兑换码开通周卡
  const rd = await req('POST', '/api/redeem', { code }, token);
  ok('redeem week -> active week', rd.status === 200 && rd.j.plan === 'week', JSON.stringify(rd.j && rd.j.user && rd.j.user.subscription));
  const until1 = new Date((await req('GET', '/api/auth/me', null, token)).j.user.subscription.until).getTime();
  // 重复兑换同码
  const rd2 = await req('POST', '/api/redeem', { code }, token);
  ok('reuse same code ->409', rd2.status === 409);
  const until1b = new Date((await req('GET', '/api/auth/me', null, token)).j.user.subscription.until).getTime();
  ok('reuse did not extend', until1 === until1b);

  // 5) pending 订单不落库：连建3个 create，后台 paid 数不变
  const before = (await req('GET', '/api/admin/users', null, null, ADMIN)).j;
  const beforeMine = before.orders.filter(o => o.email === email).length;
  for (let i = 0; i < 3; i++) await req('POST', '/api/order/create', { plan: 'month', channel: 'whop' }, token);
  const after = (await req('GET', '/api/admin/users', null, null, ADMIN)).j;
  const afterMine = after.orders.filter(o => o.email === email).length;
  ok('pending orders not shown in admin', afterMine === beforeMine, `before=${beforeMine} after=${afterMine}`);
  ok('admin orders all paid', after.orders.every(o => o.status === 'paid'));

  // 6) direct 同一 reqId 连两次：幂等，只加一次时长、只一条订单
  const reqId = 'fixed-' + ts;
  const d1 = await req('POST', '/api/order/direct', { plan: 'month', currency: 'USD', reqId }, token);
  const until2 = new Date((await req('GET', '/api/auth/me', null, token)).j.user.subscription.until).getTime();
  const d2 = await req('POST', '/api/order/direct', { plan: 'month', currency: 'USD', reqId }, token);
  const until3 = new Date((await req('GET', '/api/auth/me', null, token)).j.user.subscription.until).getTime();
  ok('direct first ok', d1.status === 200 && d1.j.ok && !d1.j.duplicate);
  ok('direct same reqId duplicate', d2.status === 200 && d2.j.duplicate === true);
  ok('duplicate did not extend again', until2 === until3, `${until2} vs ${until3}`);
  const fin = (await req('GET', '/api/admin/users', null, null, ADMIN)).j;
  const minePaid = fin.orders.filter(o => o.email === email);
  // 期望：1 redeem(week) + 1 direct(month) = 2 条 paid；同 reqId 不产生第二条
  ok('exactly 2 paid orders (redeem+direct)', minePaid.length === 2, minePaid.map(o => o.channel + ':' + o.plan).join(','));

  console.log(`\nSUMMARY pass=${pass} fail=${fail}`, fail === 0 ? 'ALL PASS' : 'HAS FAIL');
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
