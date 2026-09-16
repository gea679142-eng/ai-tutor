// 回归：树洞模式 + 课程模式 对话双语与字段洁净
const base='http://localhost:3000';
async function req(m,p,b,t){const h={'Content-Type':'application/json'};if(t)h.Authorization='Bearer '+t;const r=await fetch(base+p,{method:m,headers:h,body:b?JSON.stringify(b):undefined});let j=null;try{j=await r.json();}catch(e){}return{status:r.status,j};}
const LABEL=/translation|teaching_?point|teachingpoint|教学点|知识点|["'{}]\s*(reply|翻译|译文)\s*[:：]/i;
(async()=>{
  const ts=Date.now();
  const reg=await req('POST','/api/auth/register',{email:`md_${ts}@example.com`,password:'test123456',nativeLang:'en',targetLang:'zh'});
  const T=reg.j.token;
  await req('POST','/api/order/direct',{plan:'month',currency:'USD',reqId:'md-'+ts},T);
  let pass=0,fail=0;
  function check(name,r,expectHan){
    const reply=(r.j&&r.j.reply)||'',trans=(r.j&&r.j.translation)||'',speak=r.j&&r.j.speakLang;
    const han=(reply.match(/[一-鿿]/g)||[]).length;
    const ok=r.status===200&&speak==='zh'&&han>=expectHan&&!!trans&&!LABEL.test(reply)&&!LABEL.test(trans);
    console.log((ok?'PASS ':'FAIL ')+name+` status=${r.status} speak=${speak} han=${han} leak=${LABEL.test(reply)||LABEL.test(trans)}`);
    console.log('   主句:',reply.slice(0,70));console.log('   字幕:',trans.slice(0,70));
    ok?pass++:fail++;
  }
  const th=await req('POST','/api/chat',{mode:'treehole',nativeLang:'en',targetLang:'zh',character:'female',message:'I had a really bad day, my boss yelled at me.'},T);
  check('树洞 treehole',th,2);
  await new Promise(r=>setTimeout(r,1500));
  const co=await req('POST','/api/chat',{mode:'course',nativeLang:'en',targetLang:'zh',character:'female',
    courseInfo:{cat:'beginner',course:{id:'b1',title:'你好 Greetings',lang:'zh'}},message:'Hello teacher, nice to meet you.'},T);
  check('课程 course(b1)',co,2);
  console.log(`\n#### modes: ${pass} passed, ${fail} failed ####`);
  process.exit(fail?1:0);
})();
