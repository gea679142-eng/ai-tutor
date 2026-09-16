// 回归：译文方向校验（重点：含“翻译/教语言”元指令时，用户译文与AI字幕都不能译反或变成对话解释）
const base='http://localhost:3000';
async function req(m,p,b,t){const h={'Content-Type':'application/json'};if(t)h.Authorization='Bearer '+t;const r=await fetch(base+p,{method:m,headers:h,body:b?JSON.stringify(b):undefined});let j=null;try{j=await r.json();}catch(e){}return{status:r.status,j};}
const han=s=>(String(s||'').match(/[一-鿿]/g)||[]).length;
const lat=s=>(String(s||'').match(/[A-Za-z]+/g)||[]).length;
(async()=>{
  let pass=0,fail=0; const F=[];
  function ck(n,c,ex){console.log((c?'PASS ':'FAIL ')+n+(ex?' :: '+ex:''));c?pass++:(fail++,F.push(n));}
  // 账号A：母语中文→学英文。用户说中文（含元指令/口语），用户译文必须是英文(无汉字)；AI说英文，字幕中文
  let ts=Date.now();
  let r=await req('POST','/api/auth/register',{email:`td_zh_${ts}@example.com`,password:'test123456',nativeLang:'zh',targetLang:'en'});
  let T=r.j.token; await req('POST','/api/order/direct',{plan:'month',currency:'USD',reqId:'td-zh-'+ts},T);
  const zhInputs=['你现在教我学习中文吧。','请把这句话翻译成英文，谢谢。','我今晚想休息，明天还要早起上班。'];
  for(let k=0;k<zhInputs.length;k++){
    const x=await req('POST','/api/chat',{mode:'chat',nativeLang:'zh',targetLang:'en',character:'male',message:zhInputs[k]},T);
    const ut=x.j.user_translation||'',reply=x.j.reply||'',tr=x.j.translation||'';
    ck(`[zh→en]轮${k+1} 用户话译成英文(无汉字)`, x.status===200&&han(ut)===0&&lat(ut)>=1, `ut="${ut.slice(0,40)}" han=${han(ut)}`);
    ck(`[zh→en]轮${k+1} AI说英文(无汉字)`, han(reply)===0&&lat(reply)>=2, `reply="${reply.slice(0,40)}"`);
    ck(`[zh→en]轮${k+1} AI字幕是中文`, han(tr)>=1, `sub="${tr.slice(0,30)}"`);
    await new Promise(r=>setTimeout(r,1400));
  }
  // 账号B：母语英文→学中文。用户说英文，用户译文中文；AI中文，字幕英文
  ts=Date.now()+1;
  r=await req('POST','/api/auth/register',{email:`td_en_${ts}@example.com`,password:'test123456',nativeLang:'en',targetLang:'zh'});
  T=r.j.token; await req('POST','/api/order/direct',{plan:'month',currency:'USD',reqId:'td-en-'+ts},T);
  const enInputs=['Can you teach me how to say this in Chinese?','I want to rest tonight and go to work early tomorrow.'];
  for(let k=0;k<enInputs.length;k++){
    const x=await req('POST','/api/chat',{mode:'chat',nativeLang:'en',targetLang:'zh',character:'female',message:enInputs[k]},T);
    const ut=x.j.user_translation||'',reply=x.j.reply||'',tr=x.j.translation||'';
    ck(`[en→zh]轮${k+1} 用户话译成中文`, han(ut)>=1, `ut="${ut.slice(0,30)}"`);
    ck(`[en→zh]轮${k+1} AI说中文`, han(reply)>=2, `reply="${reply.slice(0,30)}"`);
    ck(`[en→zh]轮${k+1} AI字幕英文(无汉字)`, han(tr)===0&&lat(tr)>=2, `sub="${tr.slice(0,40)}"`);
    await new Promise(r=>setTimeout(r,1400));
  }
  console.log(`\n#### trans-direction: ${pass} passed, ${fail} failed ####`);
  if(F.length)console.log('失败: '+F.join(' | '));
  process.exit(fail?1:0);
})();
