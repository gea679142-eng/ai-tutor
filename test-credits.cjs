const BASE='http://localhost:3000';
const ts=Date.now();
async function post(path,body,token){
  const h={'Content-Type':'application/json'};
  if(token)h['Authorization']='Bearer '+token;
  const r=await fetch(BASE+path,{method:'POST',headers:h,body:JSON.stringify(body||{})});
  return {status:r.status,data:await r.json().catch(()=>({}))};
}
async function get(path,token){
  const h={}; if(token)h['Authorization']='Bearer '+token;
  const r=await fetch(BASE+path,{headers:h});
  return {status:r.status,data:await r.json().catch(()=>({}))};
}
(async()=>{
  const email=`cred_${ts}@example.com`;
  let r=await post('/api/auth/register',{email,password:'test123456',nativeLang:'en',targetLang:'zh',character:'female'});
  console.log('register',r.status,r.data.error||'ok',r.data.token?'(token ok)':'(no token)');
  const token=r.data.token;
  r=await get('/api/me',token);
  console.log('me',r.status,JSON.stringify(r.data).slice(0,200));
  // 未积分对话应 402
  r=await post('/api/chat',{message:'hi',mode:'chat'},token);
  console.log('chat no credits',r.status,r.data.error);
  // mock-pay pack120
  r=await post('/api/order/mock-pay',{pack:'pack120'},token);
  console.log('mock-pay',r.status,'credits=',r.data.user&&r.data.user.credits);
  // 对话扣分
  r=await post('/api/chat',{message:'你好',mode:'chat'},token);
  console.log('chat',r.status,'credits now=',r.data.credits);
  if(r.status!==200) console.log('  reply error:',r.data.error||r.data.error);
  // 兑换码（手动造）— 这里只验证 redeem 路由存在
  r=await post('/api/redeem',{code:'FAKECODE'},token);
  console.log('redeem fake',r.status,r.data.error);
  console.log('DONE');
})();
