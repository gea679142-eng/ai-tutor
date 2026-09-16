// 补测：学英文方向（de/ru/ar/th/id），加大间隔规避 auth/cost 限流
const base='http://localhost:3000';
async function req(m,p,b,t){const h={'Content-Type':'application/json'};if(t)h.Authorization='Bearer '+t;const r=await fetch(base+p,{method:m,headers:h,body:b?JSON.stringify(b):undefined});let j=null;try{j=await r.json();}catch(e){}return{status:r.status,j};}
const han=s=>(String(s||'').match(/[一-鿿]/g)||[]).length;
const lat=s=>(String(s||'').match(/[A-Za-z]+/g)||[]).length;
const arabic=s=>(String(s||'').match(/[؀-ۿ]/g)||[]).length;
const thai=s=>(String(s||'').match(/[฀-๿]/g)||[]).length;
const cyr=s=>(String(s||'').match(/[Ѐ-ӿ]/g)||[]).length;
const UTTER={de:'Hallo, ich möchte heute Englisch lernen',ru:'Привет, я хочу учить английский сегодня',ar:'مرحبا، أريد أن أتعلم الإنجليزية اليوم',th:'สวัสดีครับ ผมอยากเรียนภาษาอังกฤษวันนี้',id:'Halo, saya ingin belajar bahasa Inggris hari ini'};
const shape=(code,tr)=>{switch(code){case'ar':return arabic(tr)>=2;case'th':return thai(tr)>=2;case'ru':return cyr(tr)>=2;default:return String(tr||'').trim().length>=1;}};
(async()=>{
  let pass=0,fail=0;const F=[];
  for(const nat of ['de','ru','ar','th','id']){
    const tag=`[${nat}→en]`;
    const ts=Date.now();
    const reg=await req('POST','/api/auth/register',{email:`enx_${nat}_${ts}@example.com`,password:'test123456',nativeLang:nat,targetLang:'en'});
    if(reg.status!==200){console.log('FAIL '+tag+' 注册 '+reg.status);fail++;F.push(tag+'注册');await new Promise(r=>setTimeout(r,8000));continue;}
    const T=reg.j.token;
    await req('POST','/api/order/direct',{plan:'month',currency:'USD',reqId:'enx-'+nat+'-'+ts},T);
    const op=await req('POST','/api/chat/opener',{mode:'chat',nativeLang:nat,targetLang:'en',character:'female'},T);
    const opOk=op.j&&op.j.speakLang==='en'&&lat(op.j.reply)>=2&&han(op.j.reply)===0&&shape(nat,op.j.translation);
    console.log((opOk?'PASS ':'FAIL ')+tag+' opener说英文+母语字幕 :: '+(op.j?op.j.speakLang+' | '+String(op.j.reply).slice(0,30)+' | '+String(op.j.translation).slice(0,24):op.status));
    opOk?pass++:(fail++,F.push(tag+'opener'));
    const c=await req('POST','/api/chat',{mode:'chat',nativeLang:nat,targetLang:'en',character:'female',message:UTTER[nat]},T);
    const cOk=c.j&&c.j.speakLang==='en'&&lat(c.j.reply)>=2&&han(c.j.reply)===0&&shape(nat,c.j.translation)&&han(c.j.user_translation)===0&&lat(c.j.user_translation)>=2;
    console.log((cOk?'PASS ':'FAIL ')+tag+' 对话英文+母语字幕+用户话译英文 :: '+(c.j?String(c.j.reply).slice(0,30)+' | ut='+String(c.j.user_translation).slice(0,24):c.status));
    cOk?pass++:(fail++,F.push(tag+'chat'));
    await new Promise(r=>setTimeout(r,7000));
  }
  console.log(`\n#### en-matrix補測: ${pass} passed, ${fail} failed ####`);
  if(F.length)console.log('失败: '+F.join(' | '));
  process.exit(fail?1:0);
})();
