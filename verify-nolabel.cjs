// 回归：多轮真实对话，reply/字幕不得出现 translation/teaching_point 等内部字段名
const base='http://localhost:3000';
async function req(m,p,b,t){const h={'Content-Type':'application/json'};if(t)h.Authorization='Bearer '+t;const r=await fetch(base+p,{method:m,headers:h,body:b?JSON.stringify(b):undefined});let j=null;try{j=await r.json();}catch(e){}return{status:r.status,j};}
const LABEL=/translation|teaching_?point|teachingpoint|教学点|知识点|["'{}]\s*(reply|翻译|译文)\s*[:：]/i;
(async()=>{
  const ts=Date.now();
  const reg=await req('POST','/api/auth/register',{email:`nl_${ts}@example.com`,password:'test123456',nativeLang:'en',targetLang:'zh'});
  const T=reg.j.token;
  await req('POST','/api/order/direct',{plan:'month',currency:'USD',reqId:'nl-'+ts},T);
  const msgs=['Hello! How are you today?','I just finished work and I feel hungry.','What should I eat tonight?'];
  let pass=0,fail=0;
  for(let k=0;k<msgs.length;k++){
    const r=await req('POST','/api/chat',{mode:'chat',nativeLang:'en',targetLang:'zh',character:'male',message:msgs[k]},T);
    const reply=r.j.reply||'',trans=r.j.translation||'';
    const leakR=LABEL.test(reply), leakT=LABEL.test(trans);
    const han=(reply.match(/[一-鿿]/g)||[]).length;
    const ok=r.status===200&&!leakR&&!leakT&&han>=2&&!!trans;
    console.log((ok?'PASS':'FAIL')+` 轮${k+1} status=${r.status} han=${han} leakReply=${leakR} leakTrans=${leakT}`);
    console.log('   主句:',reply.slice(0,60));
    console.log('   字幕:',trans.slice(0,60));
    ok?pass++:fail++;
    await new Promise(r=>setTimeout(r,1500));
  }
  console.log(`\n#### no-label: ${pass} passed, ${fail} failed ####`);
  process.exit(fail?1:0);
})();
