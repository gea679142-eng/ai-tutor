// 实测火山 seed-tts-2.0 候选音色：打印 code 与音频字节，筛出可用音色
const https = require('https');
const KEY = '0c859faf-caff-448f-a444-aa54d7cb573b';
const candidates = [
  ['zh_female_gaolengyujie_uranus_bigtts','你好，我是你的中文老师，今天我们一起练习口语。'],
  ['zh_female_vv_uranus_bigtts','你好，我是你的中文老师，今天我们一起练习口语。'],
  ['zh_male_cixingjieshuonan_uranus_bigtts','你好，我是你的中文老师，今天我们一起练习口语。'],
  ['zh_male_shenyeboke_uranus_bigtts','你好，夜深了，今天过得怎么样，跟我聊聊吧。'],
  ['zh_male_aojiaobazong_uranus_bigtts','你好，我是你的中文老师，今天我们一起练习口语。'],
  ['zh_male_wennuanahu_uranus_bigtts','你好，我是你的中文老师，今天我们一起练习口语。'],
  ['en_female_natasha_uranus_bigtts',"Hi, I'm your English teacher. Let's practice together."],
  ['en_female_pleasant-female_uranus_bigtts',"Hi, I'm your English teacher. Let's practice together."],
  ['en_male_david_uranus_bigtts',"Hi, I'm your English teacher. Let's practice together."],
  ['en_male_adam-imitation_uranus_bigtts',"Hi, I'm your English teacher. Let's practice together."],
  ['en_male_bill_jones_corey_uranus_bigtts',"Hi, I'm your English teacher. Let's practice together."]
];
function test(speaker, text){
  return new Promise(resolve=>{
    const body=JSON.stringify({req_params:{text,speaker,audio_params:{format:'mp3',sample_rate:24000}}});
    const req=https.request({hostname:'openspeech.bytedance.com',path:'/api/v3/tts/unidirectional',method:'POST',headers:{'Content-Type':'application/json','X-Api-Key':KEY,'X-Api-Resource-Id':'seed-tts-2.0'}},r=>{
      const ch=[];r.on('data',d=>ch.push(d));r.on('end',()=>{
        const t=Buffer.concat(ch).toString();
        let b64='',code=null,msg='';
        const re=/"data":"([^"]+)"/g;let m;while((m=re.exec(t))!==null)b64+=m[1];
        try{const j=JSON.parse(t);code=j.code;msg=j.message||j.StatusMessage||'';if(j.data)b64=b64||j.data;}catch(e){ const mm=t.match(/"code":\s*(-?\d+)/); if(mm)code=+mm[1]; }
        resolve({speaker,code,bytes:Buffer.from(b64,'base64').length,msg:String(msg).slice(0,60)});
      });
    });
    req.on('error',e=>resolve({speaker,code:'NET',bytes:0,msg:e.message}));
    req.write(body);req.end();
  });
}
(async()=>{ for(const [sp,tx] of candidates){ const r=await test(sp,tx); console.log((r.bytes>1000?'OK  ':'FAIL'), r.speaker.padEnd(48),'code='+r.code,'bytes='+r.bytes, r.msg); } })();
