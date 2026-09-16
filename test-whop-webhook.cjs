const crypto = require('crypto');
require('dotenv').config();
const SECRET = process.env.WHOP_WEBHOOK_SECRET || 'test_secret_123';

async function call(url, body, headers) {
  const r = await fetch(url, { method:'POST', headers, body });
  const txt = await r.text();
  return { status:r.status, body:txt };
}
function sign(secret, wid, ts, raw) {
  return crypto.createHmac('sha256', secret).update(`${wid}.${ts}.${raw}`).digest('base64');
}

(async () => {
  const BASE='http://localhost:3000';
  const email = `whop_${Date.now()}@example.com`;
  let r = await call(BASE+'/api/auth/register', JSON.stringify({email,password:'test123456',nativeLang:'en',targetLang:'zh',character:'female'}), {'Content-Type':'application/json'});
  const reg = JSON.parse(r.body);
  const token = reg.token;
  console.log('1. register', r.status);

  r = await call(BASE+'/api/order/create', JSON.stringify({pack:'pack120'}), {'Content-Type':'application/json','Authorization':'Bearer '+token});
  const order = JSON.parse(r.body).order;
  console.log('2. order', order.id, order.pack, order.credits);

  r = await fetch(BASE+'/api/auth/me', {headers:{Authorization:'Bearer '+token}});
  const me1 = await r.json();
  console.log('3. credits before =', (me1.user||me1).credits);

  const wid = 'evt_test_' + Date.now();
  const ts = Math.floor(Date.now()/1000).toString();
  const payload = JSON.stringify({
    type:'payment.succeeded',
    data:{ id: order.id, amount_after_fees: 18.43, currency:'USD',
      metadata:{ order_id: order.id, email: email } }
  });
  const goodSig = sign(SECRET, wid, ts, payload);
  r = await call(BASE+'/api/webhooks/whop', payload, {
    'Content-Type':'application/json',
    'webhook-id': wid, 'webhook-timestamp': ts, 'webhook-signature': 'v1,'+goodSig
  });
  console.log('4. webhook good sign', r.status, r.body);

  r = await fetch(BASE+'/api/auth/me', {headers:{Authorization:'Bearer '+token}});
  const me2 = await r.json(); const c2=(me2.user||me2).credits;
  console.log('5. credits after =', c2, c2===120?'[OK]':'[FAIL expected 120]');

  r = await call(BASE+'/api/webhooks/whop', payload, {
    'Content-Type':'application/json',
    'webhook-id': wid, 'webhook-timestamp': ts, 'webhook-signature': 'v1,'+goodSig
  });
  console.log('6. duplicate delivery', r.status, r.body);
  r = await fetch(BASE+'/api/auth/me', {headers:{Authorization:'Bearer '+token}});
  const me3 = await r.json(); const c3=(me3.user||me3).credits;
  console.log('   credits still', c3, c3===120?'[OK no double]':'[FAIL DOUBLE ADD]');

  r = await call(BASE+'/api/webhooks/whop', payload, {
    'Content-Type':'application/json',
    'webhook-id': wid+'_x', 'webhook-timestamp': ts, 'webhook-signature': 'v1,badsig'
  });
  console.log('7. bad sign', r.status, r.body);

  const oldTs = (Math.floor(Date.now()/1000)-1000).toString();
  const oldSig = sign(SECRET, wid+'_old', oldTs, payload);
  r = await call(BASE+'/api/webhooks/whop', payload, {
    'Content-Type':'application/json',
    'webhook-id': wid+'_old', 'webhook-timestamp': oldTs, 'webhook-signature': 'v1,'+oldSig
  });
  console.log('8. stale timestamp', r.status, r.body);
  console.log('DONE');
})();
