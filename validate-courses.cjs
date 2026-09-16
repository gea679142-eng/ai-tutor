const m = require('./public/courses-data.js');
const COURSES = m.COURSES || m;
const ids = Object.keys(COURSES);
console.log('total courses:', ids.length);
let problems=0;
function qValid(data,q){
  if(!q||!q.type) return false;
  if(q.type==='learn') return true;
  if(q.type==='flash'||q.type==='pairs') return !!(data.words&&data.words.length);
  if(q.type==='order') return !!(q.words&&q.words.length);
  if(q.type==='blank') return !!(q.options&&q.options.length&&q.answer);
  if(q.type==='tf') return (q.answer===true||q.answer===false);
  if(q.type==='speak') return !!q.speak;
  if(q.type==='choice') return !!(q.options&&q.options.length&&(q.answer!=null));
  return false;
}
ids.forEach(id=>{
  const d=COURSES[id];
  const raw=(d.qs||[]).length;
  const valid=(d.qs||[]).filter(q=>qValid(d,q));
  const types={}; valid.forEach(q=>types[q.type]=(types[q.type]||0)+1);
  const words=(d.words||[]).length;
  let issues=[];
  if(!d.title) issues.push('NO_TITLE');
  if(!d.scene) issues.push('NO_SCENE');
  if(words<3) issues.push('WORDS<3:'+words);
  if(valid.length===0) issues.push('NO_VALID_QS');
  // choice/blank 答案必须在选项内
  (d.qs||[]).forEach((q,i)=>{
    if(!qValid(d,q)){ issues.push('invalidQ#'+i+':'+q.type); return; }
    if(q.type==='choice' && q.options.indexOf(q.answer)<0) issues.push('choiceAnsNotFound#'+i);
    if(q.type==='blank' && q.options.indexOf(q.answer)<0) issues.push('blankAnsNotFound#'+i);
    if(q.type==='order' && (!Array.isArray(q.words)||q.words.length<2)) issues.push('orderShort#'+i);
  });
  if(issues.length){ problems++; console.log('ISSUES',id,'raw',raw,'valid',valid.length,'=>',issues.join(', ')); }
  console.log(id.padEnd(9), 'words='+String(words).padEnd(2),'valid='+String(valid.length).padEnd(2), JSON.stringify(types));
});
console.log(problems===0?'ALL COURSES OK':('PROBLEM COURSES: '+problems));
