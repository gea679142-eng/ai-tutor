// 离线验证 parseModelJson 对各种模型输出格式的鲁棒性（直接从 server.js 提取真实函数）
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/server.js', 'utf8');
const start = src.indexOf('function parseModelJson');
const marker = src.indexOf('\n// 三套对话人格', start);
const fnSrc = src.slice(start, marker).trim();
eval(fnSrc);

let pass = 0, fail = 0;
function t(name, cond, extra) { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? ' :: ' + extra : '')); cond ? pass++ : fail++; }
const hasLabel = s => /translation|teaching|reply|翻译|译文|教学点|知识点|[:：]\s*$/i.test(String(s));

// 1) 本次故障：单行、无 reply 标签、中文冒号
let r = parseModelJson('这么晚还喝茶呀，是不是忙到现在还没歇？ translation：You\'re still drinking tea so late, have you been busy until now? teaching_point：忙到现在');
t('1 单行无标签-reply纯净', r.reply === '这么晚还喝茶呀，是不是忙到现在还没歇？', JSON.stringify(r));
t('1 translation不吞teaching', r.translation === "You're still drinking tea so late, have you been busy until now?", r.translation);
t('1 teaching正确', r.teaching_point === '忙到现在', r.teaching_point);

// 2) 严格 JSON
r = parseModelJson('{"reply":"你好，我是小美","translation":"Hi, I am Mei","teaching_point":"你好"}');
t('2 严格JSON', r.reply === '你好，我是小美' && r.translation === 'Hi, I am Mei' && r.teaching_point === '你好', JSON.stringify(r));

// 3) 单行带英文标签、英文冒号
r = parseModelJson('reply: 你好呀 translation: Hello there teaching_point: 你好');
t('3 单行带标签', r.reply === '你好呀' && r.translation === 'Hello there' && r.teaching_point === '你好', JSON.stringify(r));

// 4) 纯中文，无任何字段
r = parseModelJson('你好，很高兴认识你，今天过得怎么样？');
t('4 纯中文无字段', r.reply === '你好，很高兴认识你，今天过得怎么样？' && !r.translation, JSON.stringify(r));

// 5) markdown 代码块包裹 JSON
r = parseModelJson('```json\n{"reply":"早上好","translation":"Good morning","teaching_point":"早上"}\n```');
t('5 markdown代码块', r.reply === '早上好' && r.translation === 'Good morning', JSON.stringify(r));

// 6) JSON 缺 teaching_point
r = parseModelJson('{"reply":"再见","translation":"Bye"}');
t('6 缺teaching不报错', r.reply === '再见' && r.translation === 'Bye' && r.teaching_point === '', JSON.stringify(r));

// 7) 多行格式
r = parseModelJson('reply: 今天天气真好\ntranslation: The weather is nice today\nteaching_point: 天气');
t('7 多行', r.reply === '今天天气真好' && r.translation === 'The weather is nice today' && r.teaching_point === '天气', JSON.stringify(r));

// 8) 英文字幕里含时间冒号，不应被错切
r = parseModelJson('现在九点半 translation: It is 9:30 now teaching_point: 九点半');
t('8 值内含冒号不误切', r.reply === '现在九点半' && r.translation === 'It is 9:30 now' && r.teaching_point === '九点半', JSON.stringify(r));

// 9) reply 正文里出现“他说：”这种正常中文，不应被当字段截断
r = parseModelJson('他说：“你好”，然后笑了 translation: He said hello and smiled');
t('9 正文“他说：”不被截断', r.reply.indexOf('他说') === 0 && r.reply.indexOf('translation') < 0 && r.translation === 'He said hello and smiled', JSON.stringify(r));

// 10) 所有 reply 不得残留字段标签
[['a','好的 translation：ok teaching_point：好'],['b',JSON.stringify({reply:'嗯',translation:'yeah',teaching_point:'嗯'})]].forEach(([n,s])=>{
  const x = parseModelJson(s);
  t('10['+n+'] reply无标签泄漏', !hasLabel(x.reply), JSON.stringify(x.reply));
});

console.log('\n#### parseModelJson: ' + pass + ' passed, ' + fail + ' failed ####');
process.exit(fail ? 1 : 0);
