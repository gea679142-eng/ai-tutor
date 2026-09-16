// ============ 全站课程数据（依据 HSK 分级大纲与 Chinese Grammar Wiki 语法框架自编，原创题目） ============
// 设计原则：题目里所有“正确答案/选项”一律用中文稳定值，判定与界面语言解耦，绝不因翻译导致误判；
// 需要翻译成学习者母语的词/句，由引擎用 courses-i18n.js 词典按所选母语渲染（trOpt:1 = 选项也要译母语）。
// 题型 type：
//  learn   语法/要点学习卡（自动读取本课 grammar）
//  flash   单词翻卡（自动读取本课 words，WordWall Flashcards）
//  pairs   中文-母语配对（自动读取本课 words，WordWall Match up）
//  choice  单选：listen(朗读answer)/char(大字)/emoji/q(题干)/answer/options；trOpt=选项译成母语
//  order   组词成句：words=正确顺序词块（引擎打乱），母语句意由词典按整句提供（WordWall Unjumble）
//  blank   选词填空：before + [空] + after，options，answer（WordWall Cloze）
//  tf      判断对错：纯中文陈述，answer=true/false
//  speak   跟读：speak=句子，听原音后跟读
var COURSES = {
// ---------------- Unit 1 零基础入门 ----------------
b1: { title:'你好', emoji:'👋', scene:'第一次见面、打招呼', goal:'会问候、做最简单的自我介绍、道别',
  grammar:{ formula:'主语 + 是 + 名词；陈述句末加“吗”变一般疑问', ex:['你好！我是 Tom。','你是美国人吗？—— 是的。'], note:'“是”相当于判断动词 to be；“吗”放句末表疑问，回答用“是/不是”。' },
  words:[ {zh:'你好',py:'nǐ hǎo',en:'Hello',e:'👋'},{zh:'谢谢',py:'xièxie',en:'Thank you',e:'🙏'},{zh:'再见',py:'zàijiàn',en:'Goodbye',e:'👋'},{zh:'我',py:'wǒ',en:'I / me',e:'🙋'},{zh:'你',py:'nǐ',en:'You',e:'👉'},{zh:'是',py:'shì',en:'To be / yes',e:'✅'} ],
  qs:[
    {type:'learn'},
    {type:'flash'},
    {type:'pairs'},
    {type:'choice', listen:1, answer:'你好', options:['你好','再见','谢谢','我很好']},
    {type:'choice', char:'好', q:'“好 hǎo”是第几声？', answer:'第三声', options:['第一声','第二声','第三声','第四声']},
    {type:'order', words:['我','是','学生']},
    {type:'blank', before:'我', after:'Tom。', options:['叫','是','有'], answer:'是'},
    {type:'tf', q:'说“谢谢”是在向别人表达感谢。', answer:true},
    {type:'choice', q:'别人对你说“你好！”，你应该说？', answer:'你好！', options:['你好！','再见！','谢谢！','对不起！']},
    {type:'speak', speak:'你好！我是 Tom。'}
  ]},
b2: { title:'你叫什么', emoji:'🙋', scene:'互相认识、问名字和国籍', goal:'会问名字、回答姓名、问来自哪里',
  grammar:{ formula:'主语 + 叫 + 名字；疑问词“什么/哪”在被问成分的位置', ex:['你叫什么名字？','我叫小明。','你是哪国人？'], note:'中文疑问词不提前，语序和陈述句一样：你叫[什么]。' },
  words:[ {zh:'叫',py:'jiào',en:'To be called',e:'🏷️'},{zh:'名字',py:'míngzi',en:'Name',e:'🪪'},{zh:'什么',py:'shénme',en:'What',e:'❓'},{zh:'哪国',py:'nǎ guó',en:'Which country',e:'🌍'},{zh:'人',py:'rén',en:'Person',e:'🧑'},{zh:'他',py:'tā',en:'He / him',e:'👨'} ],
  qs:[
    {type:'learn'},{type:'flash'},{type:'pairs'},
    {type:'choice', char:'我', trOpt:1, answer:'我', options:['我','你','他','他们']},
    {type:'choice', listen:1, answer:'你叫什么名字？', options:['你叫什么名字？','你好吗？','你几岁？','你是谁？']},
    {type:'order', words:['我','叫','小明']},
    {type:'blank', before:'你叫', after:'名字？', options:['什么','怎么','多少'], answer:'什么'},
    {type:'tf', q:'“我叫……”是用来介绍自己名字的说法。', answer:true},
    {type:'choice', q:'别人问“你是哪国人？”，你回答？', answer:'我是美国人', options:['我是美国人','我叫 Tom','我很好','再见']},
    {type:'speak', speak:'我叫 Tom，你呢？'}
  ]},
b3: { title:'打电话', emoji:'📱', scene:'接打电话、留言等待', goal:'会用电话用语开场、请对方稍等',
  grammar:{ formula:'请 + 动词（请等一下）；能……吗？表请求', ex:['喂，你好！','请等一下。','能帮我转告他吗？'], note:'接电话先说“喂(wéi)”；“请+动词”是礼貌请求。' },
  words:[ {zh:'电话',py:'diànhuà',en:'Phone call',e:'📱'},{zh:'喂',py:'wéi',en:'Hello (phone)',e:'📞'},{zh:'号码',py:'hàomǎ',en:'Number',e:'🔢'},{zh:'等',py:'děng',en:'To wait',e:'⏳'},{zh:'一下',py:'yíxià',en:'A moment',e:'⏱️'},{zh:'帮',py:'bāng',en:'To help',e:'🤝'} ],
  qs:[
    {type:'learn'},{type:'flash'},{type:'pairs'},
    {type:'choice', char:'号码', trOpt:1, answer:'号码', options:['号码','名字','时间','地点']},
    {type:'choice', listen:1, answer:'喂，你好！', options:['喂，你好！','再见！','谢谢！','对不起！']},
    {type:'order', words:['请','等','一下']},
    {type:'blank', before:'', after:'，你好！', options:['喂','哎','哦'], answer:'喂'},
    {type:'tf', q:'“请等一下”是请对方稍微等待的礼貌说法。', answer:true},
    {type:'choice', q:'接起电话第一句通常说？', answer:'喂，你好！', options:['喂，你好！','再见！','谢谢！','对不起！']},
    {type:'speak', speak:'喂，你好，请问找谁？'}
  ]},
b4: { title:'多少钱', emoji:'💰', scene:'购物问价、讨价还价', goal:'会问价格、说贵或便宜、完成简单交易',
  grammar:{ formula:'疑问“多少/几”问数量；太 + 形容词', ex:['这个多少钱？','十块钱。','太贵了，便宜一点。'], note:'钱数用“数字+块(元)”；“太+adj+了”表程度“过于……”。' },
  words:[ {zh:'钱',py:'qián',en:'Money',e:'💵'},{zh:'多少',py:'duōshao',en:'How much',e:'❓'},{zh:'块',py:'kuài',en:'Yuan (colloq.)',e:'🪙'},{zh:'贵',py:'guì',en:'Expensive',e:'💸'},{zh:'便宜',py:'piányi',en:'Cheap',e:'🏷️'},{zh:'买',py:'mǎi',en:'To buy',e:'🛒'} ],
  qs:[
    {type:'learn'},{type:'flash'},{type:'pairs'},
    {type:'choice', char:'便宜', trOpt:1, answer:'便宜', options:['便宜','贵','大','小']},
    {type:'choice', listen:1, answer:'这个多少钱？', options:['这个多少钱？','你好吗？','几点了？','在哪里？']},
    {type:'order', words:['这个','多少','钱']},
    {type:'blank', before:'太', after:'了，便宜一点。', options:['贵','好','多'], answer:'贵'},
    {type:'tf', q:'口语里“块”表示钱的单位，相当于“元”。', answer:true},
    {type:'choice', q:'店员说“十块钱”，你决定买，说？', answer:'好的，给你钱', options:['好的，给你钱','再见','你好','对不起']},
    {type:'speak', speak:'这个多少钱？'}
  ]},
b5: { title:'在哪里', emoji:'📍', scene:'问路、找地方、指示方向', goal:'会问地点、听懂简单方向指示',
  grammar:{ formula:'主语 + 在 + 地点；往/向 + 方向 + 走', ex:['厕所在哪里？','往前走，往左拐。','我在这里。'], note:'“在”引出位置；疑问词“哪里”问地点。' },
  words:[ {zh:'哪里',py:'nǎlǐ',en:'Where',e:'📍'},{zh:'在',py:'zài',en:'At / to be at',e:'📌'},{zh:'厕所',py:'cèsuǒ',en:'Toilet',e:'🚻'},{zh:'走',py:'zǒu',en:'To walk / go',e:'🚶'},{zh:'前',py:'qián',en:'Front',e:'⬆️'},{zh:'左右',py:'zuǒyòu',en:'Left / right',e:'↔️'} ],
  qs:[
    {type:'learn'},{type:'flash'},{type:'pairs'},
    {type:'choice', char:'哪里', trOpt:1, answer:'哪里', options:['哪里','什么','什么时候','谁']},
    {type:'choice', listen:1, answer:'厕所在哪里？', options:['厕所在哪里？','多少钱？','几点了？','你好吗？']},
    {type:'order', words:['请问','地铁站','在','哪里']},
    {type:'blank', before:'往前', after:'。', options:['走','买','吃'], answer:'走'},
    {type:'tf', q:'“往左拐”是指向左边转弯。', answer:true},
    {type:'choice', q:'你想问路，最礼貌的开头是？', answer:'请问，……在哪里？', options:['请问，……在哪里？','多少钱？','你好吗？','再见！']},
    {type:'speak', speak:'请问，地铁站在哪里？'}
  ]},
// ---------------- Unit 2 日常生活 ----------------
b6: { title:'点餐', emoji:'🍜', scene:'在餐厅点餐、买单', goal:'会点主食饮料、表达好吃、叫买单',
  grammar:{ formula:'主语 + 要 + 名词；量词“碗/杯/个”', ex:['我要一碗面条。','来一杯水。','服务员，买单！'], note:'点餐用“要”；数词+量词+名词（一碗面、一杯茶）。' },
  words:[ {zh:'面条',py:'miàntiáo',en:'Noodles',e:'🍜'},{zh:'米饭',py:'mǐfàn',en:'Rice',e:'🍚'},{zh:'喝',py:'hē',en:'To drink',e:'🥤'},{zh:'吃',py:'chī',en:'To eat',e:'🍽️'},{zh:'菜单',py:'càidān',en:'Menu',e:'📋'},{zh:'买单',py:'mǎidān',en:'Pay the bill',e:'🧾'} ],
  qs:[
    {type:'learn'},{type:'flash'},{type:'pairs'},
    {type:'choice', char:'米饭', trOpt:1, answer:'米饭', options:['米饭','面条','面包','肉']},
    {type:'choice', listen:1, answer:'我要这个', options:['我要这个','多少钱','你好吗','再见']},
    {type:'order', words:['我','要','一','碗','面条']},
    {type:'blank', before:'来一', after:'水。', options:['杯','本','个'], answer:'杯'},
    {type:'tf', q:'在餐厅说“买单”是要求结账付款。', answer:true},
    {type:'choice', q:'服务员问“要点什么？”，你说？', answer:'我要一碗面条', options:['我要一碗面条','再见','对不起','你好吗']},
    {type:'speak', speak:'服务员，我要点餐。'}
  ]},
b7: { title:'几点了', emoji:'⏰', scene:'问时间、说作息', goal:'会问钟点、说几点半、区分早中晚',
  grammar:{ formula:'现在 + 几点？；数字 + 点（+分/半）', ex:['现在几点？','三点半。','我每天六点起床。'], note:'“点”是钟点单位，“半”=30分；时间词常放句首。' },
  words:[ {zh:'时间',py:'shíjiān',en:'Time',e:'⏰'},{zh:'点',py:'diǎn',en:"O'clock",e:'🕐'},{zh:'半',py:'bàn',en:'Half',e:'🌗'},{zh:'现在',py:'xiànzài',en:'Now',e:'⏺️'},{zh:'早上',py:'zǎoshang',en:'Morning',e:'🌅'},{zh:'今天',py:'jīntiān',en:'Today',e:'📅'} ],
  qs:[
    {type:'learn'},{type:'flash'},{type:'pairs'},
    {type:'choice', char:'小时', trOpt:1, answer:'小时', options:['小时','分钟','秒','天']},
    {type:'choice', listen:1, answer:'现在几点？', options:['现在几点？','多少钱？','在哪里？','你好吗？']},
    {type:'order', words:['现在','几','点']},
    {type:'blank', before:'三', after:'半。', options:['点','个','本'], answer:'点'},
    {type:'tf', q:'“三点半”表示的时间是 3:30。', answer:true},
    {type:'choice', q:'“三点半”是几点？', answer:'3:30', options:['3:30','3:00','4:30','2:30']},
    {type:'speak', speak:'请问现在几点了？'}
  ]},
b8: { title:'天气', emoji:'🌤️', scene:'聊天气、冷热晴雨', goal:'会描述天气和体感温度',
  grammar:{ formula:'名词 + 怎么样？；很/太 + 形容词', ex:['今天天气怎么样？','今天晴天，很热。','外面在下雨。'], note:'“怎么样”问状况；形容词前常用“很”，不强调“非常”。' },
  words:[ {zh:'天气',py:'tiānqì',en:'Weather',e:'🌤️'},{zh:'晴天',py:'qíngtiān',en:'Sunny',e:'☀️'},{zh:'下雨',py:'xiàyǔ',en:'To rain',e:'🌧️'},{zh:'冷',py:'lěng',en:'Cold',e:'❄️'},{zh:'热',py:'rè',en:'Hot',e:'🥵'},{zh:'风',py:'fēng',en:'Wind',e:'💨'} ],
  qs:[
    {type:'learn'},{type:'flash'},{type:'pairs'},
    {type:'choice', char:'下雨', trOpt:1, answer:'下雨', options:['下雨','晴天','风','雪']},
    {type:'choice', listen:1, answer:'今天天气怎么样？', options:['今天天气怎么样？','多少钱？','几点了？','你好吗？']},
    {type:'order', words:['今天','天气','真','好']},
    {type:'blank', before:'今天很', after:'。', options:['热','饭','水'], answer:'热'},
    {type:'tf', q:'“刮风”表示外面正在吹风。', answer:true},
    {type:'choice', q:'别人问“今天天气怎么样？”，你回答？', answer:'今天晴天，很热', options:['今天晴天，很热','我很好','多少钱','再见']},
    {type:'speak', speak:'今天天气真好。'}
  ]},
b9: { title:'我的家', emoji:'🏠', scene:'介绍家人和住所', goal:'会称呼家庭成员、简单介绍家',
  grammar:{ formula:'这是 + 人/物；人称“的”表领属', ex:['这是我爸爸。','这是我的家。','我妈妈是老师。'], note:'介绍人/物用“这是…”；“我的+名词”表所属。' },
  words:[ {zh:'家',py:'jiā',en:'Home / family',e:'🏠'},{zh:'爸爸',py:'bàba',en:'Father',e:'👨'},{zh:'妈妈',py:'māma',en:'Mother',e:'👩'},{zh:'哥哥',py:'gēge',en:'Older brother',e:'👦'},{zh:'姐姐',py:'jiějie',en:'Older sister',e:'👧'},{zh:'这',py:'zhè',en:'This',e:'👉'} ],
  qs:[
    {type:'learn'},{type:'flash'},{type:'pairs'},
    {type:'choice', char:'妈妈', trOpt:1, answer:'妈妈', options:['妈妈','爸爸','儿子','女儿']},
    {type:'choice', listen:1, answer:'这是我家', options:['这是我家','你好吗','多少钱','再见']},
    {type:'order', words:['这','是','我','爸爸']},
    {type:'blank', before:'这是', after:'家。', options:['我','你','他'], answer:'我'},
    {type:'tf', q:'“哥哥”用来称呼比自己年长的哥哥。', answer:true},
    {type:'choice', q:'你想介绍自己的妈妈，说？', answer:'这是我妈妈', options:['这是我妈妈','多少钱','再见','你好吗']},
    {type:'speak', speak:'这是我的家人。'}
  ]},
b10: { title:'购物', emoji:'🛒', scene:'在商店挑商品、试穿', goal:'会表达想买、问尺码颜色、试穿',
  grammar:{ formula:'想 + 动词（想要做）；有 + 没有？', ex:['我想买一件衣服。','有没有大一点的？','我可以试一下吗？'], note:'“想+动词”表意愿；“有没有”问是否存在。' },
  words:[ {zh:'商店',py:'shāngdiàn',en:'Shop',e:'🏪'},{zh:'衣服',py:'yīfu',en:'Clothes',e:'👕'},{zh:'卖',py:'mài',en:'To sell',e:'🏷️'},{zh:'试',py:'shì',en:'To try',e:'🤔'},{zh:'大小',py:'dàxiǎo',en:'Size',e:'📏'},{zh:'颜色',py:'yánsè',en:'Color',e:'🎨'} ],
  qs:[
    {type:'learn'},{type:'flash'},{type:'pairs'},
    {type:'choice', char:'衣服', trOpt:1, answer:'衣服', options:['衣服','鞋子','食物','书']},
    {type:'choice', listen:1, answer:'我想买这个', options:['我想买这个','你好吗','再见','几点了']},
    {type:'order', words:['我','想','买','一','件','衣服']},
    {type:'blank', before:'我可以', after:'一下吗？', options:['试','吃','走'], answer:'试'},
    {type:'tf', q:'“有没有大一点的？”是在询问是否有更大的尺码。', answer:true},
    {type:'choice', q:'店员问“您要什么？”，你只是先看看，说？', answer:'我看看，谢谢', options:['我看看，谢谢','再见','对不起','你好吗']},
    {type:'speak', speak:'我想买一件衣服。'}
  ]},
b11: { title:'数字 1-100', emoji:'🔢', scene:'说数字、年龄、电话与数量', goal:'掌握 1-10 并会组合十几、几十',
  grammar:{ formula:'十几=十+个位数；几十=个位+十；一百=100', ex:['一、二、三…十。','十五=15，二十=20，三十三=33。'], note:'中文数字十进制直接拼：21=二十一；“二/两”区分：表示数量用“两”（两个人）。' },
  words:[ {zh:'一',py:'yī',en:'One',e:'1️⃣'},{zh:'五',py:'wǔ',en:'Five',e:'5️⃣'},{zh:'十',py:'shí',en:'Ten',e:'🔟'},{zh:'百',py:'bǎi',en:'Hundred',e:'💯'},{zh:'几',py:'jǐ',en:'How many',e:'🔢'},{zh:'岁',py:'suì',en:'Years old',e:'🎂'} ],
  qs:[
    {type:'learn'},{type:'flash'},{type:'pairs'},
    {type:'choice', char:'十五', answer:'15', options:['15','50','5','55']},
    {type:'choice', listen:1, speak:'二十三', answer:'23', options:['23','32','13','203']},
    {type:'order', words:['三','十','五']},
    {type:'blank', before:'我二十', after:'。', options:['岁','个','本'], answer:'岁'},
    {type:'tf', q:'表示“两个人”时用“两”，不用“二”。', answer:true},
    {type:'choice', q:'“你几岁？”是在问什么？', answer:'年龄', options:['年龄','名字','时间','地点']},
    {type:'speak', speak:'我今年二十五岁。'}
  ]},
b12: { title:'星期和日期', emoji:'📅', scene:'说星期、日期、约时间', goal:'会说星期几、年月日、预约安排',
  grammar:{ formula:'星期 + 一…日/天；年/月/日；“在/号”', ex:['今天星期一。','我的生日是五月三号。','我们周末见。'], note:'星期顺序：一二三四五六日(天)；日期说“X月X号/日”。' },
  words:[ {zh:'星期',py:'xīngqī',en:'Week',e:'📆'},{zh:'今天',py:'jīntiān',en:'Today',e:'📅'},{zh:'明天',py:'míngtiān',en:'Tomorrow',e:'➡️'},{zh:'昨天',py:'zuótiān',en:'Yesterday',e:'⬅️'},{zh:'生日',py:'shēngrì',en:'Birthday',e:'🎂'},{zh:'周末',py:'zhōumò',en:'Weekend',e:'🎉'} ],
  qs:[
    {type:'learn'},{type:'flash'},{type:'pairs'},
    {type:'choice', char:'明天', trOpt:1, answer:'明天', options:['明天','今天','昨天','现在']},
    {type:'choice', listen:1, answer:'今天星期三', options:['今天星期三','多少钱','几点了','你好吗']},
    {type:'order', words:['明天','星期','五']},
    {type:'blank', before:'我的生日是五月三', after:'。', options:['号','个','本'], answer:'号'},
    {type:'tf', q:'“周末”指星期六和星期日。', answer:true},
    {type:'choice', q:'一周的第一天（中文习惯）是？', answer:'星期一', options:['星期一','星期五','星期日','星期六']},
    {type:'speak', speak:'我们星期一见。'}
  ]},
b13: { title:'交通出行', emoji:'🚇', scene:'打车、坐地铁、买票出行', goal:'会说目的地、买票、听懂到站',
  grammar:{ formula:'坐 + 交通工具；到 + 地点；多少钱一张票', ex:['我要去机场。','坐地铁到天安门。','一张票多少钱？'], note:'“坐+交通工具”表示乘坐；“到+地点”表目的地。' },
  words:[ {zh:'地铁',py:'dìtiě',en:'Subway',e:'🚇'},{zh:'出租车',py:'chūzūchē',en:'Taxi',e:'🚕'},{zh:'机场',py:'jīchǎng',en:'Airport',e:'✈️'},{zh:'站',py:'zhàn',en:'Station / stop',e:'🚉'},{zh:'票',py:'piào',en:'Ticket',e:'🎫'},{zh:'到',py:'dào',en:'To arrive',e:'🎯'} ],
  qs:[
    {type:'learn'},{type:'flash'},{type:'pairs'},
    {type:'choice', char:'出租车', trOpt:1, answer:'出租车', options:['出租车','地铁','飞机','船']},
    {type:'choice', listen:1, answer:'我要去机场', options:['我要去机场','我要吃饭','我要买票回家','你好吗']},
    {type:'order', words:['坐','地铁','到','火车站']},
    {type:'blank', before:'一张', after:'多少钱？', options:['票','水','饭'], answer:'票'},
    {type:'tf', q:'坐车时“下一站”指接下来要到达的那一站。', answer:true},
    {type:'choice', q:'上出租车后告诉司机目的地，说？', answer:'我要去机场', options:['我要去机场','多少钱','再见','你好吗']},
    {type:'speak', speak:'请问到火车站怎么走？'}
  ]},
b14: { title:'看病就医', emoji:'🏥', scene:'在医院描述症状、看医生', goal:'会说哪里不舒服、听懂简单医嘱',
  grammar:{ formula:'主语 + 哪里 + 不舒服？；有点/很 + 症状', ex:['你哪里不舒服？','我有点头疼。','一天吃三次药。'], note:'描述症状用“部位+疼/不舒服”；“有点+adj”表轻微。' },
  words:[ {zh:'医院',py:'yīyuàn',en:'Hospital',e:'🏥'},{zh:'医生',py:'yīshēng',en:'Doctor',e:'👨‍⚕️'},{zh:'头疼',py:'tóuténg',en:'Headache',e:'🤕'},{zh:'药',py:'yào',en:'Medicine',e:'💊'},{zh:'舒服',py:'shūfu',en:'Comfortable',e:'😌'},{zh:'发烧',py:'fāshāo',en:'Fever',e:'🌡️'} ],
  qs:[
    {type:'learn'},{type:'flash'},{type:'pairs'},
    {type:'choice', char:'药', trOpt:1, answer:'药', options:['药','水','食物','茶']},
    {type:'choice', listen:1, answer:'我有点头疼', options:['我有点头疼','我很开心','我要吃饭','我去上班']},
    {type:'order', words:['我','有','一点','头疼']},
    {type:'blank', before:'一天吃三次', after:'。', options:['药','饭','水'], answer:'药'},
    {type:'tf', q:'“发烧”表示体温升高、身体发热。', answer:true},
    {type:'choice', q:'医生问“你哪里不舒服？”，你头疼，说？', answer:'我有点头疼', options:['我有点头疼','我很高兴','再见','谢谢多少钱']},
    {type:'speak', speak:'医生，我有点不舒服。'}
  ]},
b15: { title:'爱好', emoji:'🎸', scene:'聊兴趣爱好、周末活动', goal:'会说自己喜欢做什么、问对方爱好',
  grammar:{ formula:'主语 + 喜欢 + 动词/名词；爱好 + 是…', ex:['我喜欢听音乐。','你有什么爱好？','我喜欢打篮球。'], note:'“喜欢”后可直接跟动词或名词，表达爱好。' },
  words:[ {zh:'喜欢',py:'xǐhuan',en:'To like',e:'❤️'},{zh:'音乐',py:'yīnyuè',en:'Music',e:'🎵'},{zh:'运动',py:'yùndòng',en:'Sports',e:'⚽'},{zh:'电影',py:'diànyǐng',en:'Movie',e:'🎬'},{zh:'看书',py:'kànshū',en:'Read books',e:'📖'},{zh:'旅游',py:'lǚyóu',en:'Travel',e:'🧳'} ],
  qs:[
    {type:'learn'},{type:'flash'},{type:'pairs'},
    {type:'choice', char:'运动', trOpt:1, answer:'运动', options:['运动','音乐','电影','书']},
    {type:'choice', listen:1, answer:'我喜欢听音乐', options:['我喜欢听音乐','我去上班了','我吃饭了','我买东西']},
    {type:'order', words:['我','喜欢','打','篮球']},
    {type:'blank', before:'你有什么', after:'？', options:['爱好','吃饭','时间'], answer:'爱好'},
    {type:'tf', q:'“喜欢”后面可以直接跟动词，比如“喜欢看书”。', answer:true},
    {type:'choice', q:'别人问“你有什么爱好？”，你说？', answer:'我喜欢听音乐', options:['我喜欢听音乐','我叫 Tom','我三点走','我买这个']},
    {type:'speak', speak:'我的爱好是旅游。'}
  ]},
b16: { title:'交朋友·约会', emoji:'💞', scene:'认识新朋友、邀约、表达好感', goal:'会发出邀请、约时间、表达欣赏',
  grammar:{ formula:'要不要/一起 + 动词？；觉得 + 人/物 + 怎么样', ex:['要不要一起喝杯咖啡？','我觉得你很可爱。','这周末你有空吗？'], note:'“要不要……？”是轻松的邀请；“有空”表示有时间。' },
  words:[ {zh:'朋友',py:'péngyou',en:'Friend',e:'🤝'},{zh:'一起',py:'yìqǐ',en:'Together',e:'👫'},{zh:'有空',py:'yǒukòng',en:'Free (time)',e:'🕰️'},{zh:'约会',py:'yuēhuì',en:'Date / appointment',e:'💌'},{zh:'咖啡',py:'kāfēi',en:'Coffee',e:'☕'},{zh:'可爱',py:'kěài',en:'Lovely / cute',e:'😊'} ],
  qs:[
    {type:'learn'},{type:'flash'},{type:'pairs'},
    {type:'choice', char:'一起', trOpt:1, answer:'一起', options:['一起','独自','从不','马上']},
    {type:'choice', listen:1, answer:'这周末你有空吗', options:['这周末你有空吗','你叫什么名字','这个多少钱','现在几点']},
    {type:'order', words:['要不要','一起','喝','咖啡']},
    {type:'blank', before:'我觉得你很', after:'。', options:['可爱','吃饭','走路'], answer:'可爱'},
    {type:'tf', q:'“你有空吗？”是在问对方有没有时间。', answer:true},
    {type:'choice', q:'你想约朋友周末看电影，说？', answer:'这周末你有空吗？一起看电影吧', options:['这周末你有空吗？一起看电影吧','我头疼','多少钱','再见谢谢']},
    {type:'speak', speak:'要不要一起喝杯咖啡？'}
  ]},
// ---------------- Unit 3 职场行业 ----------------
seasia1: { title:'工厂上岗', emoji:'🏭', scene:'中资工厂流水线、安全与排班', goal:'听懂开工/安全/质检等上岗指令',
  grammar:{ formula:'动词 + 开始/完；要/不要 + 动词（指令）', ex:['开始工作！','注意安全，戴好安全帽。','今天加班一小时。'], note:'车间指令多为简短动词句；“注意+名词”表提醒。' },
  words:[ {zh:'工厂',py:'gōngchǎng',en:'Factory',e:'🏭'},{zh:'安全',py:'ānquán',en:'Safety',e:'🦺'},{zh:'上班',py:'shàngbān',en:'Start work',e:'⏰'},{zh:'加班',py:'jiābān',en:'Overtime',e:'⏱️'},{zh:'质检',py:'zhìjiǎn',en:'Quality check',e:'🔍'},{zh:'下班',py:'xiàbān',en:'End shift',e:'🏃'} ],
  qs:[
    {type:'learn'},{type:'flash'},{type:'pairs'},
    {type:'choice', char:'质检', trOpt:1, answer:'质检', options:['质检','包装','发货','打扫']},
    {type:'choice', listen:1, answer:'开始工作', options:['开始工作','下班了','休息','吃饭']},
    {type:'order', words:['请','注意','安全']},
    {type:'blank', before:'今天要', after:'一小时。', options:['加班','吃饭','睡觉'], answer:'加班'},
    {type:'tf', q:'班长说“注意安全”是在提醒你小心、保证安全。', answer:true},
    {type:'choice', q:'班长说“开工了”是什么意思？', answer:'开始工作', options:['开始工作','回家','午休','下班']},
    {type:'speak', speak:'好的，我明白了。'}
  ]},
seasia2: { title:'跨境电商', emoji:'📦', scene:'虾皮/Lazada 客服、订单与发货', goal:'会处理订单、发货、退货、好评沟通',
  grammar:{ formula:'请 + 动词 + 名词；动词+货（发货/退货/收货）', ex:['您的订单今天发货。','可以七天无理由退货。','感谢您的好评！'], note:'电商高频动宾：下订单、发货、退货、收货。' },
  words:[ {zh:'订单',py:'dìngdān',en:'Order',e:'📦'},{zh:'发货',py:'fāhuò',en:'Ship goods',e:'🚚'},{zh:'退货',py:'tuìhuò',en:'Return goods',e:'↩️'},{zh:'客服',py:'kèfú',en:'Customer service',e:'💬'},{zh:'好评',py:'hǎopíng',en:'Good review',e:'⭐'},{zh:'库存',py:'kùcún',en:'Stock',e:'📊'} ],
  qs:[
    {type:'learn'},{type:'flash'},{type:'pairs'},
    {type:'choice', char:'退货', trOpt:1, answer:'退货', options:['退货','发货','下单','付款']},
    {type:'choice', listen:1, answer:'请查收订单', options:['请查收订单','你好吗','再见','吃饭']},
    {type:'order', words:['今天','就','发货']},
    {type:'blank', before:'感谢您的', after:'！', options:['好评','吃饭','走路'], answer:'好评'},
    {type:'tf', q:'“没库存了”表示商品暂时卖完、没有现货。', answer:true},
    {type:'choice', q:'客户问“什么时候发货？”，你说？', answer:'今天就发货', options:['今天就发货','我不知道','再见','多少钱']},
    {type:'speak', speak:'您好，请问有什么可以帮您？'}
  ]},
seasia3: { title:'外贸跟单', emoji:'📋', scene:'报价、对账、交期谈判', goal:'会报价、谈价格、确认交期与付款',
  grammar:{ formula:'动词+价（报价/讲价）；以…为准；可以/不可以', ex:['这是最新报价单。','量大可以优惠。','交期是下周五。'], note:'商务用语偏正式：“请查收/确认/安排”。' },
  words:[ {zh:'报价',py:'bàojià',en:'Quote',e:'💹'},{zh:'价格',py:'jiàgé',en:'Price',e:'💰'},{zh:'付款',py:'fùkuǎn',en:'Payment',e:'💳'},{zh:'交期',py:'jiāoqī',en:'Delivery date',e:'📅'},{zh:'优惠',py:'yōuhuì',en:'Discount',e:'🏷️'},{zh:'确认',py:'quèrèn',en:'Confirm',e:'✅'} ],
  qs:[
    {type:'learn'},{type:'flash'},{type:'pairs'},
    {type:'choice', char:'交期', trOpt:1, answer:'交期', options:['交期','价格','质量','数量']},
    {type:'choice', listen:1, answer:'请发报价单', options:['请发报价单','你好吗','再见','谢谢']},
    {type:'order', words:['量','大','可以','优惠']},
    {type:'blank', before:'请您', after:'一下订单。', options:['确认','吃饭','走路'], answer:'确认'},
    {type:'tf', q:'“对账”是核对双方往来的账目是否一致。', answer:true},
    {type:'choice', q:'客户说“价格能便宜吗？”，你说？', answer:'量大可以优惠', options:['量大可以优惠','不行再见','我不知道','马上发货']},
    {type:'speak', speak:'这是我们的最新报价。'}
  ]},
seasia4: { title:'面试', emoji:'🎤', scene:'中资公司面试、自我介绍与谈薪', goal:'会自我介绍、谈经验与薪资、得体应答',
  grammar:{ formula:'我有 + 数量 + 年 + 经验；为什么/想 + 动词', ex:['请做一下自我介绍。','我有三年工作经验。','我希望在这里长期发展。'], note:'面试用“我+经历/能力”，表达意愿用“希望/想”。' },
  words:[ {zh:'面试',py:'miànshì',en:'Interview',e:'🎤'},{zh:'工作',py:'gōngzuò',en:'Job / work',e:'💼'},{zh:'简历',py:'jiǎnlì',en:'Resume',e:'📄'},{zh:'经验',py:'jīngyàn',en:'Experience',e:'🏅'},{zh:'薪资',py:'xīnzī',en:'Salary',e:'💰'},{zh:'公司',py:'gōngsī',en:'Company',e:'🏢'} ],
  qs:[
    {type:'learn'},{type:'flash'},{type:'pairs'},
    {type:'choice', char:'简历', trOpt:1, answer:'简历', options:['简历','护照','卡片','信件']},
    {type:'choice', listen:1, answer:'请自我介绍', options:['请自我介绍','你好吗','再见','谢谢']},
    {type:'order', words:['我','有','三','年','经验']},
    {type:'blank', before:'我希望在这里长期', after:'。', options:['发展','吃饭','走路'], answer:'发展'},
    {type:'tf', q:'“薪资”就是工作所得到的工资报酬。', answer:true},
    {type:'choice', q:'面试官问“为什么来我们公司？”，你说？', answer:'我想在这里发展', options:['我想在这里发展','我不知道','再见','多少钱']},
    {type:'speak', speak:'您好，我来面试。'}
  ]},
// ---------------- Unit 4 HSK 考级 ----------------
hsk1: { title:'HSK 1-2 入门', emoji:'📝', scene:'HSK1-2 核心语法：是/有/不/没', goal:'掌握判断句、存在句和基本否定',
  grammar:{ formula:'是(判断) / 有(拥有) / 不(现在将来否定) / 没(过去与拥有否定)', ex:['我是学生。','我有一本书。','我不喝咖啡。','我昨天没去。'], note:'“不”否定习惯/将来，“没”否定完成与“有”。' },
  words:[ {zh:'是',py:'shì',en:'To be',e:'✅'},{zh:'有',py:'yǒu',en:'To have',e:'🤲'},{zh:'不',py:'bù',en:'Not (will/habit)',e:'🚫'},{zh:'没',py:'méi',en:'Not (past/have)',e:'⛔'},{zh:'学生',py:'xuésheng',en:'Student',e:'🎓'},{zh:'老师',py:'yīshēng',en:'Teacher',e:'👩‍🏫'} ],
  qs:[
    {type:'learn'},{type:'flash'},{type:'pairs'},
    {type:'choice', char:'学生', trOpt:1, answer:'学生', options:['学生','老师','工人','医生']},
    {type:'choice', listen:1, answer:'我是学生', options:['我是学生','我吃饭','他去学校','你好吗']},
    {type:'order', words:['我','没','有','钱']},
    {type:'blank', before:'我明天', after:'去。', options:['不','没','是'], answer:'不'},
    {type:'tf', q:'否定“拥有”时用“没（有）”，比如“我没有钱”。', answer:true},
    {type:'choice', q:'“你是中国人吗？”的否定回答是？', answer:'不是，我是美国人', options:['不是，我是美国人','是的我是','我有','我喜欢']},
    {type:'speak', speak:'我是学生，我学习中文。'}
  ]},
hsk2: { title:'HSK 3-4 进阶', emoji:'📚', scene:'HSK3-4 复句：如果/虽然/因为', goal:'掌握假设、转折、因果等关联结构',
  grammar:{ formula:'如果…就…；虽然…但是…；因为…所以…', ex:['如果明天下雨，我就不去。','虽然很难，但是我喜欢。','因为忙，所以没去。'], note:'中文关联词常成对出现，连接两个小句。' },
  words:[ {zh:'觉得',py:'juéde',en:'To think/feel',e:'🤔'},{zh:'认为',py:'rènwéi',en:'To consider',e:'💭'},{zh:'如果',py:'rúguǒ',en:'If',e:'❓'},{zh:'虽然',py:'suīrán',en:'Although',e:'↩️'},{zh:'因为',py:'yīnwèi',en:'Because',e:'🧩'},{zh:'所以',py:'suǒyǐ',en:'So / therefore',e:'➡️'} ],
  qs:[
    {type:'learn'},{type:'flash'},{type:'pairs'},
    {type:'choice', char:'觉得', trOpt:1, answer:'觉得', options:['觉得','看','听','知道']},
    {type:'choice', listen:1, answer:'我觉得很好', options:['我觉得很好','我吃饭了','他在哪里','现在几点']},
    {type:'order', words:['如果','下雨','就','不','去']},
    {type:'blank', before:'', after:'很忙，所以没去。', options:['因为','虽然','如果'], answer:'因为'},
    {type:'tf', q:'“虽然……但是……”是用来表示转折关系的。', answer:true},
    {type:'choice', q:'“如果……就……”表示什么关系？', answer:'假设关系', trOpt:1, options:['假设关系','因果关系','转折关系','并列关系']},
    {type:'speak', speak:'我认为这个问题可以解决。'}
  ]},
hsk4: { title:'语音声调纠音', emoji:'🎙️', scene:'声调、平翘舌、前后鼻音专项', goal:'分辨四声、zh/z、ch/c、sh/s、in/ing',
  grammar:{ formula:'四声：ā(一) á(二) ǎ(三) à(四)；zh/ch/sh 翘舌，z/c/s 平舌', ex:['mā 妈 / má 麻 / mǎ 马 / mà 骂。','四(sì)是(sì)，十(shí)是(shí)。'], note:'声调别义：ma 的四个声调是四个字；翘舌时舌尖抵上腭。' },
  words:[ {zh:'一声',py:'yīshēng',en:'High level tone',e:'➖'},{zh:'二声',py:'èrshēng',en:'Rising tone',e:'📈'},{zh:'三声',py:'sānshēng',en:'Dip tone',e:'↘️↗️'},{zh:'四声',py:'sìshēng',en:'Falling tone',e:'📉'},{zh:'翘舌',py:'qiàoshé',en:'Retroflex zh/ch/sh',e:'👅'},{zh:'平舌',py:'píngshé',en:'Flat z/c/s',e:'👄'} ],
  qs:[
    {type:'learn'},{type:'flash'},{type:'pairs'},
    {type:'choice', char:'马 mǎ', q:'“马 mǎ”是第几声？', answer:'第三声', options:['第一声','第二声','第三声','第四声']},
    {type:'choice', char:'麻 má', q:'“麻 má”是第几声？', answer:'第二声', options:['第一声','第二声','第三声','第四声']},
    {type:'choice', listen:1, answer:'四是四，十是十', options:['四是四，十是十','十四是十四','四十是四十','十四是四十']},
    {type:'order', words:['四','是','四']},
    {type:'blank', before:'zh 是', after:'音。', options:['翘舌','平舌','鼻音'], answer:'翘舌'},
    {type:'tf', q:'“十 shí”的声母是翘舌音 sh。', answer:true},
    {type:'choice', q:'zh 和 z 的区别是？', answer:'zh 翘舌、z 平舌', options:['zh 翘舌、z 平舌','完全一样','zh 平舌、z 翘舌','没有区别']},
    {type:'speak', speak:'四是四，十是十，十四是十四。'}
  ]}
};
if (typeof module !== 'undefined' && module.exports) module.exports = { COURSES };
