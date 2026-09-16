// ============ 全站界面多语言（i18n）============
// 支持 8 种母语：en 英语 / zh 中文 / ja 日语 / ko 韩语 / es 西语 / pt 葡语 / id 印尼语 / th 泰语
// 用法：元素加 data-i18n="key"（文本）或 data-i18n-ph="key"（占位符），调用 applyI18n()；JS 内用 t('key')
// 母语（界面/字幕翻译语言）：前 8 种为预制人工翻译，其余 10 种运行时调用翻译接口并缓存
var BUILTIN_UI = ['en', 'zh', 'ja', 'ko', 'es', 'pt', 'id', 'th'];
var UI_LANGS = ['en', 'zh', 'ja', 'ko', 'es', 'pt', 'id', 'th', 'fr', 'de', 'ru', 'ar', 'vi', 'it', 'tr', 'hi', 'ms', 'fil'];
var UI_LANG_NAMES = {
  en: 'English', zh: '中文', ja: '日本語', ko: '한국어',
  es: 'Español', pt: 'Português', id: 'Bahasa Indonesia', th: 'ไทย',
  fr: 'Français', de: 'Deutsch', ru: 'Русский', ar: 'العربية',
  vi: 'Tiếng Việt', it: 'Italiano', tr: 'Türkçe', hi: 'हिन्दी',
  ms: 'Bahasa Melayu', fil: 'Filipino'
};
var UI_LANG_KEY = 'ui_lang';

var I18N = {
  // ---------------- 英语（基准 / fallback） ----------------
  en: {
    app_name: 'AI Language Partner',
    tagline: 'Practice speaking with a lifelike AI',
    interface_lang: 'Interface language',
    login: 'Log in', register: 'Sign up', logout: 'Log out', renew: 'Renew',
    back: '← Back', back_home: 'Home',
    email: 'Email', password: 'Password (min 6 characters)', pw_ph: 'Enter password',
    login_btn: 'Log in', reg_btn: 'Sign up & start',
    login_tip: 'Weekly / monthly subscription or redeem a code to unlock',
    remember_me: 'Remember me',
    loading: 'Loading…',
    // 首页
    ai_learning: '🌏 AI Language Learning',
    pick_partner: 'Pick a partner and start learning',
    my_native: 'My native language (subtitles / translation)',
    learn_target: 'I want to learn (AI speaks this language)',
    course_entry: '📚 Courses', course_entry_desc: 'Game-like lessons · real-life scenarios · beginner to advanced',
    chat_entry: '💬 Scenario Chat', chat_entry_desc: 'Real-life situations · AI practice · learn while chatting',
    // 订阅状态
    plan_none: 'Not subscribed', plan_trial: 'Trial · {n} days left', plan_week: 'Weekly · {n} days left',
    plan_month: 'Monthly · {n} days left', plan_active: 'Active · {n} days left',
    // 付费墙
    current_plan: 'Current plan', choose_plan: 'Choose a plan',
    week_card: 'Weekly', month_card: 'Monthly', best_value: 'Best value',
    per_week: '7 days unlimited', per_month: '30 days unlimited',
    week_feat: 'AI scenario chat\nAll game-like courses\nSpeech recognition\n18 native-language UIs & subtitles',
    month_feat: 'Everything in Weekly\nLower daily cost\nNew features first\nStacks on renewal',
    subscribe_btn: 'Subscribe', or_redeem: 'Or redeem a code', redeem: 'Redeem',
    code_ph: 'WEEK-XXXX-XXXX',
    expire_at: 'Expires: ', service_expired: 'Subscription expired. Please subscribe to continue.',
    opened_local: 'Activated — your plan starts now.',
    redeem_ok_week: '7 days activated', redeem_ok_month: '30 days activated', redeem_success: ', redemption successful!',
    pricing_note: 'Pick a plan to activate instantly — access starts the moment you subscribe and is timed from then. You can also activate with a redeem code (generated in bulk in the admin panel). Weekly = 7×24h, monthly = 30 days. Service pauses on expiry and renewals stack on the remaining time.',
    processing: 'Processing…', order_fail: 'Order failed', activate_fail: 'Activation failed', redeem_fail: 'Redemption failed',
    // 对话页
    mode_course: 'Course', mode_chat: 'Scenario Chat',
    input_ph: 'Hold the mic to speak, or type a message…',
    online: 'online', typing: 'typing…', recognizing: 'recognizing…',
    didnt_hear: "Didn't catch that, please say it again", recognize_failed: 'Recognition failed',
    replay: '🔊 Replay', sub_expired_alert: 'Subscription expired. Please subscribe first.',
    allow_mic: 'Please allow microphone access',
    goal: 'Goal', terms: 'Key words',
    // 课程列表
    learn_cn: '🇨🇳 Learn Chinese', xp_label: 'XP',
    unit1: '🌱 Unit 1: Absolute Beginner', unit1d: 'Pinyin · tones · greetings · 5 lessons',
    unit2: '🍜 Unit 2: Daily Life', unit2d: 'Food · shopping · travel · 5 lessons',
    unit3: '💼 Unit 3: Workplace', unit3d: 'Interview · factory · e-commerce · 4 lessons',
    unit4: '📝 Unit 4: HSK Exam', unit4d: 'Globally recognized · 3 lessons',
    // 课程练习
    q_listen: '🔊 Listen and choose', q_speak: '🎤 Repeat after me', tap_listen: 'Tap 🔊 to listen, then repeat',
    i_read: 'I read it, continue →', choose_answer: 'Choose the correct answer',
    lesson_done: 'Complete!', score_label: 'Score', ai_practice: '💬 AI conversation practice',
    back_courses: 'Back to lessons', cont: 'Continue',
    // 错误
    err_required: 'Please enter email and password', err_password_short: 'Password must be at least 6 characters',
    err_invalid_email: 'Invalid email format', err_email_exists: 'This email is already registered, please log in',
    err_account_notfound: 'Account not found, please sign up first', err_wrong_password: 'Incorrect password',
    err_code_invalid: 'Invalid redeem code', err_code_used: 'This code has already been used',
    err_bad_code_type: 'Invalid code type', err_bad_plan: 'Invalid plan', err_fail: 'Operation failed',
    // 选老师 / 情景 / 通话 / 联系
    pick_teacher: 'Choose your AI teacher',
    teacher_female: 'Female teacher · Mei', teacher_male: 'Male teacher · Ming',
    teacher_style_q: 'Which style do you like?',
    style_real: 'Realistic', style_3d: '3D cartoon', style_anime: 'Anime', style_illus: 'Illustration',
    start_learning: 'Start learning →', change_teacher: 'Change teacher',
    free_chat: 'Free chat', free_chat_desc: 'Relaxed, caring & a little flirty · learn while chatting',
    treehole_entry: 'Your tree-hole', treehole_desc: 'Vent your feelings · a partner who truly listens',
    scenario_chat: 'Scenario role-play',
    call_mode: 'Call', call_hint: 'On a call — speak freely, your teacher replies by voice', tap_enable_audio: 'Tap anywhere to turn on voice',
    mic_once: 'Speak once', end_call: 'End call', listening: 'Listening… speak now',
    contact_dev: 'Contact the developer', teacher_ready: 'All set! Your teacher is ready.',
    male_voice: 'Deep, magnetic male voice', female_voice: 'Warm, elegant female voice',
    native_tongue: 'Native language', target_tongue: 'Language to learn',
    lessons_unit: 'lessons', course_missing: 'Lesson not found'
  },

  // ---------------- 中文 ----------------
  zh: {
    app_name: 'AI 语言伙伴', tagline: '和真人一样的 AI 陪你练口语',
    interface_lang: '界面语言',
    login: '登录', register: '注册', logout: '退出', renew: '续费',
    back: '← 返回', back_home: '首页',
    email: '邮箱', password: '密码（至少6位）', pw_ph: '输入密码',
    login_btn: '登录', reg_btn: '注册并开始',
    login_tip: '开通周卡 / 月卡订阅，或使用兑换码解锁',
    remember_me: '记住我',
    loading: '加载中…',
    ai_learning: '🌏 AI 语言学习', pick_partner: '选一个伙伴，开始沉浸式学习',
    my_native: '我的母语（字幕 / 翻译语言）', learn_target: '我要学（AI 用这门语言说话）',
    course_entry: '📚 课程学习', course_entry_desc: '游戏化闯关 · 情景课程 · 从入门到精通',
    chat_entry: '💬 情景对话', chat_entry_desc: '真实生活场景 · AI 陪练 · 边聊边学',
    plan_none: '未开通', plan_trial: '试用 · 剩{n}天', plan_week: '周卡 · 剩{n}天',
    plan_month: '月卡 · 剩{n}天', plan_active: '已开通 · 剩{n}天',
    current_plan: '当前订阅', choose_plan: '选择订阅套餐',
    week_card: '周卡', month_card: '月卡', best_value: '最划算',
    per_week: '7 天不限次', per_month: '30 天不限次',
    week_feat: 'AI 情景对话\n全部游戏化课程\n语音识别跟读\n18 种母语对照字幕',
    month_feat: '周卡全部权益\n平均每天更低\n优先体验新功能\n续费自动叠加',
    subscribe_btn: '开通所选套餐', or_redeem: '或使用兑换码', redeem: '兑换',
    code_ph: 'WEEK-XXXX-XXXX',
    expire_at: '到期时间：', service_expired: '服务已到期，请开通后继续学习',
    opened_local: '已开通，服务从现在开始计时',
    redeem_ok_week: '已开通7天', redeem_ok_month: '已开通30天', redeem_success: '，兑换成功！',
    pricing_note: '选择套餐即可即时开通，从订阅成功时刻开始计时；也可用兑换码开通（兑换码在管理后台批量生成）。周卡=7×24小时，月卡=30天，到期自动暂停，续费在剩余时间上叠加。',
    processing: '处理中…', order_fail: '下单失败', activate_fail: '开通失败', redeem_fail: '兑换失败',
    mode_course: '课程学习', mode_chat: '情景对话',
    input_ph: '按住麦克风说话，或输入文字…',
    online: '在线', typing: '正在输入…', recognizing: '识别中…',
    didnt_hear: '没听清，请再说一次', recognize_failed: '识别失败',
    replay: '🔊 重听', sub_expired_alert: '订阅已到期，请先开通', allow_mic: '请允许麦克风权限',
    goal: '目标', terms: '术语',
    learn_cn: '🇨🇳 学中文', xp_label: '经验值',
    unit1: '🌱 第1单元：零基础入门', unit1d: '拼音 · 声调 · 打招呼 · 5节课',
    unit2: '🍜 第2单元：日常生活', unit2d: '吃饭 · 购物 · 出行 · 5节课',
    unit3: '💼 第3单元：职场生存', unit3d: '面试 · 工厂 · 电商 · 4节课',
    unit4: '📝 第4单元：HSK 考试', unit4d: '全球认证 · 3节课',
    q_listen: '🔊 听并选择', q_speak: '🎤 跟读练习', tap_listen: '点🔊听，然后跟读',
    i_read: '我读了，继续 →', choose_answer: '选择正确答案',
    lesson_done: '完成！', score_label: '得分', ai_practice: '💬 AI对话练习',
    back_courses: '返回课表', cont: '继续',
    err_required: '请输入邮箱和密码', err_password_short: '密码至少6位',
    err_invalid_email: '邮箱格式不正确', err_email_exists: '该邮箱已注册，请直接登录',
    err_account_notfound: '账号不存在，请先注册', err_wrong_password: '密码错误',
    err_code_invalid: '兑换码无效', err_code_used: '该兑换码已被使用',
    err_bad_code_type: '兑换码类型异常', err_bad_plan: '套餐类型错误', err_fail: '操作失败',
    pick_teacher: '选择你的 AI 老师',
    teacher_female: '女老师 · 小美', teacher_male: '男老师 · 小明',
    teacher_style_q: '你喜欢哪种风格？',
    style_real: '真人写实', style_3d: '3D 卡通', style_anime: '日系动漫', style_illus: '扁平插画',
    start_learning: '开始学习 →', change_teacher: '更换老师',
    free_chat: '自由聊天', free_chat_desc: '轻松闲聊 · 会撩会关心 · 边聊边学',
    treehole_entry: '情绪树洞', treehole_desc: '倾诉情绪 · 一个真正懂你的倾听者',
    scenario_chat: '情景角色扮演',
    call_mode: '打电话', call_hint: '通话中——自由说话，老师会用语音回应', tap_enable_audio: '点一下页面开启语音',
    mic_once: '说一句', end_call: '挂断', listening: '聆听中…请说话',
    contact_dev: '联系开发者', teacher_ready: '太好了，你的老师已就位。',
    male_voice: '磁性低沉男声', female_voice: '温柔御姐女声',
    native_tongue: '母语', target_tongue: '要学习的语言',
    lessons_unit: '节课', course_missing: '未找到这节课'
  },

  // ---------------- 日语 ----------------
  ja: {
    app_name: 'AI言語パートナー', tagline: '本物そっくりのAIと会話練習',
    interface_lang: '表示言語',
    login: 'ログイン', register: '新規登録', logout: 'ログアウト', renew: '更新',
    back: '← 戻る', back_home: 'ホーム',
    email: 'メールアドレス', password: 'パスワード（6文字以上）', pw_ph: 'パスワードを入力',
    login_btn: 'ログイン', reg_btn: '登録して始める',
    login_tip: '週額/月額プラン、またはコードで利用開始',
    loading: '読み込み中…',
    ai_learning: '🌏 AI言語学習', pick_partner: 'パートナーを選んで学習を始めよう',
    my_native: '母国語（字幕 / 翻訳言語）', learn_target: '学びたい言語（AIがこの言語で話します）',
    course_entry: '📚 コース', course_entry_desc: 'ゲーム感覚レッスン・実践シーン・入門から上級まで',
    chat_entry: '💬 シチュエーション会話', chat_entry_desc: '実際の場面・AI練習・話しながら学ぶ',
    plan_none: '未登録', plan_trial: '体験版・残り{n}日', plan_week: '週額・残り{n}日',
    plan_month: '月額・残り{n}日', plan_active: '利用中・残り{n}日',
    current_plan: '現在のプラン', choose_plan: 'プランを選択',
    week_card: '週額', month_card: '月額', best_value: '一番お得',
    per_week: '7日間無制限', per_month: '30日間無制限',
    week_feat: 'AIシチュエーション会話\n全ゲーム式コース\n音声認識\n18言語のUIと字幕対応',
    month_feat: '週額の全機能\n1日あたり更にお得\n新機能を最速で\n更新期間は加算',
    subscribe_btn: '登録する', or_redeem: 'またはコードを使う', redeem: '交換',
    code_ph: 'WEEK-XXXX-XXXX',
    expire_at: '有効期限：', service_expired: '期限切れです。続けるには登録してください。',
    opened_local: '有効化しました。今すぐ利用開始です',
    redeem_ok_week: '7日間有効化', redeem_ok_month: '30日間有効化', redeem_success: '、交換成功！',
    pricing_note: 'プランを選ぶと即時有効化され、登録完了した瞬間から時間計算が始まります。コードでも有効化できます（コードは管理画面で一括生成）。週額=7×24時間、月額=30日。期限で自動停止、更新分は残り時間に加算されます。',
    processing: '処理中…', order_fail: '注文に失敗', activate_fail: '有効化に失敗', redeem_fail: '交換に失敗',
    mode_course: 'コース学習', mode_chat: 'シチュエーション会話',
    input_ph: 'マイクを長押しで話す、または文字を入力…',
    online: 'オンライン', typing: '入力中…', recognizing: '認識中…',
    didnt_hear: '聞き取れませんでした。もう一度どうぞ', recognize_failed: '認識に失敗しました',
    replay: '🔊 再生', sub_expired_alert: '期限切れです。先に登録してください。', allow_mic: 'マイクを許可してください',
    goal: '目標', terms: 'キーワード',
    learn_cn: '🇨🇳 中国語を学ぶ', xp_label: 'XP',
    unit1: '🌱 ユニット1：ゼロ入門', unit1d: 'ピンイン・声調・あいさつ・5レッスン',
    unit2: '🍜 ユニット2：日常生活', unit2d: '食事・買い物・移動・5レッスン',
    unit3: '💼 ユニット3：職場', unit3d: '面接・工場・EC・4レッスン',
    unit4: '📝 ユニット4：HSK試験', unit4d: '国際認定・3レッスン',
    q_listen: '🔊 聞いて選ぶ', q_speak: '🎤 リピート練習', tap_listen: '🔊を押して聞き、まねしてください',
    i_read: '読みました、次へ →', choose_answer: '正しい答えを選んでください',
    lesson_done: '完了！', score_label: 'スコア', ai_practice: '💬 AI会話練習',
    back_courses: 'レッスン一覧へ', cont: '続ける',
    err_required: 'メールとパスワードを入力してください', err_password_short: 'パスワードは6文字以上必要です',
    err_invalid_email: 'メール形式が正しくありません', err_email_exists: 'このメールは登録済みです。ログインしてください',
    err_account_notfound: 'アカウントがありません。先に登録してください', err_wrong_password: 'パスワードが違います',
    err_code_invalid: 'コードが無効です', err_code_used: 'このコードは使用済みです',
    err_bad_code_type: 'コード種別が不正です', err_bad_plan: 'プランが不正です', err_fail: '操作に失敗しました'
  },

  // ---------------- 韩语 ----------------
  ko: {
    app_name: 'AI 언어 파트너', tagline: '실제 같은 AI와 말하기 연습',
    interface_lang: '인터페이스 언어',
    login: '로그인', register: '회원가입', logout: '로그아웃', renew: '연장',
    back: '← 뒤로', back_home: '홈',
    email: '이메일', password: '비밀번호(최소 6자)', pw_ph: '비밀번호 입력',
    login_btn: '로그인', reg_btn: '가입하고 시작',
    login_tip: '주간/월간 구독 또는 코드로 잠금 해제',
    loading: '불러오는 중…',
    ai_learning: '🌏 AI 언어 학습', pick_partner: '파트너를 고르고 학습을 시작하세요',
    my_native: '모국어(자막 / 번역 언어)', learn_target: '배우고 싶은 언어(AI가 이 언어로 말해요)',
    course_entry: '📚 코스', course_entry_desc: '게임형 레슨 · 실생활 시나리오 · 입문부터 고급까지',
    chat_entry: '💬 상황 대화', chat_entry_desc: '실제 상황 · AI 연습 · 대화하며 배우기',
    plan_none: '미가입', plan_trial: '체험 · {n}일 남음', plan_week: '주간 · {n}일 남음',
    plan_month: '월간 · {n}일 남음', plan_active: '이용 중 · {n}일 남음',
    current_plan: '현재 구독', choose_plan: '요금제 선택',
    week_card: '주간', month_card: '월간', best_value: '가장 이득',
    per_week: '7일 무제한', per_month: '30일 무제한',
    week_feat: 'AI 상황 대화\n전체 게임형 코스\n음성 인식\n18개 모국어 UI·자막 지원',
    month_feat: '주간 전체 권한\n일일 비용 절감\n신기능 우선\n연장은 누적',
    subscribe_btn: '구독하기', or_redeem: '또는 코드 사용', redeem: '등록',
    code_ph: 'WEEK-XXXX-XXXX',
    expire_at: '만료일: ', service_expired: '구독이 만료되었습니다. 계속하려면 가입하세요.',
    opened_local: '활성화되었습니다. 지금부터 시작됩니다',
    redeem_ok_week: '7일 활성화', redeem_ok_month: '30일 활성화', redeem_success: ', 등록 성공!',
    pricing_note: '요금제를 선택하면 즉시 활성화되며 구독 성공 시점부터 시간이 계산됩니다. 코드로도 활성화 가능(관리자에서 일괄 생성). 주간=7×24시간, 월간=30일. 만료 시 자동 정지, 연장은 남은 시간에 누적됩니다.',
    processing: '처리 중…', order_fail: '주문 실패', activate_fail: '활성화 실패', redeem_fail: '등록 실패',
    mode_course: '코스 학습', mode_chat: '상황 대화',
    input_ph: '마이크를 길게 눌러 말하거나 메시지를 입력하세요…',
    online: '온라인', typing: '입력 중…', recognizing: '인식 중…',
    didnt_hear: '잘 듣지 못했어요. 다시 말해주세요', recognize_failed: '인식 실패',
    replay: '🔊 다시 듣기', sub_expired_alert: '구독이 만료되었습니다. 먼저 가입하세요.', allow_mic: '마이크 권한을 허용하세요',
    goal: '목표', terms: '핵심 단어',
    learn_cn: '🇨🇳 중국어 배우기', xp_label: 'XP',
    unit1: '🌱 유닛1: 왕초보', unit1d: '병음 · 성조 · 인사 · 5레슨',
    unit2: '🍜 유닛2: 일상생활', unit2d: '식사 · 쇼핑 · 이동 · 5레슨',
    unit3: '💼 유닛3: 직장', unit3d: '면접 · 공장 · 이커머스 · 4레슨',
    unit4: '📝 유닛4: HSK 시험', unit4d: '국제 인증 · 3레슨',
    q_listen: '🔊 듣고 고르기', q_speak: '🎤 따라 말하기', tap_listen: '🔊을 눌러 듣고 따라하세요',
    i_read: '읽었어요, 계속 →', choose_answer: '정답을 고르세요',
    lesson_done: '완료!', score_label: '점수', ai_practice: '💬 AI 대화 연습',
    back_courses: '레슨 목록으로', cont: '계속',
    err_required: '이메일과 비밀번호를 입력하세요', err_password_short: '비밀번호는 최소 6자입니다',
    err_invalid_email: '이메일 형식이 올바르지 않습니다', err_email_exists: '이미 가입된 이메일입니다. 로그인하세요',
    err_account_notfound: '계정이 없습니다. 먼저 가입하세요', err_wrong_password: '비밀번호가 틀렸습니다',
    err_code_invalid: '유효하지 않은 코드입니다', err_code_used: '이미 사용된 코드입니다',
    err_bad_code_type: '코드 유형 오류', err_bad_plan: '요금제 오류', err_fail: '작업 실패'
  },

  // ---------------- 西语 ----------------
  es: {
    app_name: 'Compañero de IA', tagline: 'Practica hablar con una IA muy realista',
    interface_lang: 'Idioma de la interfaz',
    login: 'Entrar', register: 'Registrarse', logout: 'Salir', renew: 'Renovar',
    back: '← Atrás', back_home: 'Inicio',
    email: 'Correo electrónico', password: 'Contraseña (mín. 6 caracteres)', pw_ph: 'Escribe tu contraseña',
    login_btn: 'Entrar', reg_btn: 'Registrarme y empezar',
    login_tip: 'Suscripción semanal/mensual o canjea un código',
    loading: 'Cargando…',
    ai_learning: '🌏 Aprende idiomas con IA', pick_partner: 'Elige un compañero y empieza',
    my_native: 'Mi idioma nativo (subtítulos / traducción)', learn_target: 'Quiero aprender (la IA habla este idioma)',
    course_entry: '📚 Cursos', course_entry_desc: 'Lecciones tipo juego · situaciones reales · de principiante a avanzado',
    chat_entry: '💬 Chat por escenarios', chat_entry_desc: 'Situaciones reales · práctica con IA · aprende charlando',
    plan_none: 'Sin suscripción', plan_trial: 'Prueba · {n} días restantes', plan_week: 'Semanal · {n} días restantes',
    plan_month: 'Mensual · {n} días restantes', plan_active: 'Activo · {n} días restantes',
    current_plan: 'Suscripción actual', choose_plan: 'Elige un plan',
    week_card: 'Semanal', month_card: 'Mensual', best_value: 'Mejor valor',
    per_week: '7 días ilimitados', per_month: '30 días ilimitados',
    week_feat: 'Chat por escenarios con IA\nTodos los cursos tipo juego\nReconocimiento de voz\n18 idiomas nativos (UI y subtítulos)',
    month_feat: 'Todo lo del Semanal\nMenor coste diario\nNuevas funciones primero\nSe acumula al renovar',
    subscribe_btn: 'Suscribirse', or_redeem: 'O canjea un código', redeem: 'Canjear',
    code_ph: 'WEEK-XXXX-XXXX',
    expire_at: 'Vence: ', service_expired: 'Suscripción vencida. Suscríbete para continuar.',
    opened_local: 'Activado: tu plan empieza ahora.',
    redeem_ok_week: '7 días activados', redeem_ok_month: '30 días activados', redeem_success: ', ¡canje correcto!',
    pricing_note: 'Elige un plan para activarlo al instante: el acceso empieza en el momento de la suscripción. También puedes activar con un código (generado en masa en el panel). Semanal = 7×24 h, mensual = 30 días. Se pausa al vencer y las renovaciones se acumulan.',
    processing: 'Procesando…', order_fail: 'Error en el pedido', activate_fail: 'Error al activar', redeem_fail: 'Error al canjear',
    mode_course: 'Curso', mode_chat: 'Chat por escenarios',
    input_ph: 'Mantén el micrófono para hablar o escribe un mensaje…',
    online: 'en línea', typing: 'escribiendo…', recognizing: 'reconociendo…',
    didnt_hear: 'No te oí, dilo otra vez', recognize_failed: 'Reconocimiento fallido',
    replay: '🔊 Repetir', sub_expired_alert: 'Suscripción vencida. Suscríbete primero.', allow_mic: 'Permite el micrófono',
    goal: 'Objetivo', terms: 'Palabras clave',
    learn_cn: '🇨🇳 Aprende chino', xp_label: 'XP',
    unit1: '🌱 Unidad 1: Desde cero', unit1d: 'Pinyin · tonos · saludos · 5 lecciones',
    unit2: '🍜 Unidad 2: Vida diaria', unit2d: 'Comer · compras · viajar · 5 lecciones',
    unit3: '💼 Unidad 3: Trabajo', unit3d: 'Entrevista · fábrica · e-commerce · 4 lecciones',
    unit4: '📝 Unidad 4: Examen HSK', unit4d: 'Certificación internacional · 3 lecciones',
    q_listen: '🔊 Escucha y elige', q_speak: '🎤 Repite después de mí', tap_listen: 'Toca 🔊 para oír y repite',
    i_read: 'Lo leí, continuar →', choose_answer: 'Elige la respuesta correcta',
    lesson_done: '¡Completado!', score_label: 'Puntuación', ai_practice: '💬 Práctica de conversación IA',
    back_courses: 'Volver a lecciones', cont: 'Continuar',
    err_required: 'Introduce correo y contraseña', err_password_short: 'La contraseña debe tener al menos 6 caracteres',
    err_invalid_email: 'Formato de correo no válido', err_email_exists: 'Ese correo ya está registrado, inicia sesión',
    err_account_notfound: 'Cuenta no encontrada, regístrate primero', err_wrong_password: 'Contraseña incorrecta',
    err_code_invalid: 'Código no válido', err_code_used: 'Este código ya se usó',
    err_bad_code_type: 'Tipo de código no válido', err_bad_plan: 'Plan no válido', err_fail: 'Operación fallida'
  },

  // ---------------- 葡语 ----------------
  pt: {
    app_name: 'Parceiro de IA', tagline: 'Pratique falar com uma IA bem realista',
    interface_lang: 'Idioma da interface',
    login: 'Entrar', register: 'Cadastrar', logout: 'Sair', renew: 'Renovar',
    back: '← Voltar', back_home: 'Início',
    email: 'E-mail', password: 'Senha (mín. 6 caracteres)', pw_ph: 'Digite a senha',
    login_btn: 'Entrar', reg_btn: 'Cadastrar e começar',
    login_tip: 'Assinatura semanal/mensal ou resgate um código',
    loading: 'Carregando…',
    ai_learning: '🌏 Aprenda idiomas com IA', pick_partner: 'Escolha um parceiro e comece',
    my_native: 'Meu idioma nativo (legendas / tradução)', learn_target: 'Quero aprender (a IA fala este idioma)',
    course_entry: '📚 Cursos', course_entry_desc: 'Lições tipo jogo · situações reais · do básico ao avançado',
    chat_entry: '💬 Chat por cenários', chat_entry_desc: 'Situações reais · prática com IA · aprenda conversando',
    plan_none: 'Sem assinatura', plan_trial: 'Teste · {n} dias restantes', plan_week: 'Semanal · {n} dias restantes',
    plan_month: 'Mensal · {n} dias restantes', plan_active: 'Ativo · {n} dias restantes',
    current_plan: 'Assinatura atual', choose_plan: 'Escolha um plano',
    week_card: 'Semanal', month_card: 'Mensal', best_value: 'Melhor valor',
    per_week: '7 dias ilimitados', per_month: '30 dias ilimitados',
    week_feat: 'Chat por cenários com IA\nTodos os cursos tipo jogo\nReconhecimento de voz\n18 idiomas nativos (UI e legendas)',
    month_feat: 'Tudo do Semanal\nCusto diário menor\nNovos recursos primeiro\nAcumula ao renovar',
    subscribe_btn: 'Assinar', or_redeem: 'Ou resgate um código', redeem: 'Resgatar',
    code_ph: 'WEEK-XXXX-XXXX',
    expire_at: 'Expira em: ', service_expired: 'Assinatura expirada. Assine para continuar.',
    opened_local: 'Ativado — seu plano começa agora.',
    redeem_ok_week: '7 dias ativados', redeem_ok_month: '30 dias ativados', redeem_success: ', resgate concluído!',
    pricing_note: 'Escolha um plano para ativar na hora: o acesso começa no instante da assinatura. Você também pode ativar com um código (gerado em massa no painel admin). Semanal = 7×24 h, mensal = 30 dias. Pausa ao expirar e renovações se acumulam.',
    processing: 'Processando…', order_fail: 'Falha no pedido', activate_fail: 'Falha ao ativar', redeem_fail: 'Falha ao resgatar',
    mode_course: 'Curso', mode_chat: 'Chat por cenários',
    input_ph: 'Segure o microfone para falar ou digite uma mensagem…',
    online: 'online', typing: 'digitando…', recognizing: 'reconhecendo…',
    didnt_hear: 'Não ouvi, fale de novo', recognize_failed: 'Reconhecimento falhou',
    replay: '🔊 Repetir', sub_expired_alert: 'Assinatura expirada. Assine primeiro.', allow_mic: 'Permita o microfone',
    goal: 'Objetivo', terms: 'Palavras-chave',
    learn_cn: '🇨🇳 Aprenda chinês', xp_label: 'XP',
    unit1: '🌱 Unidade 1: Do zero', unit1d: 'Pinyin · tons · saudações · 5 lições',
    unit2: '🍜 Unidade 2: Vida diária', unit2d: 'Comer · compras · deslocamento · 5 lições',
    unit3: '💼 Unidade 3: Trabalho', unit3d: 'Entrevista · fábrica · e-commerce · 4 lições',
    unit4: '📝 Unidade 4: Exame HSK', unit4d: 'Certificação internacional · 3 lições',
    q_listen: '🔊 Ouça e escolha', q_speak: '🎤 Repita comigo', tap_listen: 'Toque em 🔊 para ouvir e repita',
    i_read: 'Eu li, continuar →', choose_answer: 'Escolha a resposta correta',
    lesson_done: 'Concluído!', score_label: 'Pontuação', ai_practice: '💬 Prática de conversa com IA',
    back_courses: 'Voltar às lições', cont: 'Continuar',
    err_required: 'Digite e-mail e senha', err_password_short: 'A senha precisa ter ao menos 6 caracteres',
    err_invalid_email: 'Formato de e-mail inválido', err_email_exists: 'E-mail já cadastrado, faça login',
    err_account_notfound: 'Conta não encontrada, cadastre-se primeiro', err_wrong_password: 'Senha incorreta',
    err_code_invalid: 'Código inválido', err_code_used: 'Este código já foi usado',
    err_bad_code_type: 'Tipo de código inválido', err_bad_plan: 'Plano inválido', err_fail: 'Operação falhou'
  },

  // ---------------- 印尼语 ----------------
  id: {
    app_name: 'Partner Bahasa AI', tagline: 'Latihan bicara dengan AI yang sangat natural',
    interface_lang: 'Bahasa tampilan',
    login: 'Masuk', register: 'Daftar', logout: 'Keluar', renew: 'Perpanjang',
    back: '← Kembali', back_home: 'Beranda',
    email: 'Email', password: 'Kata sandi (min. 6 karakter)', pw_ph: 'Masukkan kata sandi',
    login_btn: 'Masuk', reg_btn: 'Daftar & mulai',
    login_tip: 'Langganan mingguan/bulanan atau tukar kode',
    loading: 'Memuat…',
    ai_learning: '🌏 Belajar Bahasa dengan AI', pick_partner: 'Pilih partner dan mulai belajar',
    my_native: 'Bahasa ibu saya (subtitle / terjemahan)', learn_target: 'Saya ingin belajar (AI berbicara bahasa ini)',
    course_entry: '📚 Kursus', course_entry_desc: 'Pelajaran bergaya game · skenario nyata · pemula sampai mahir',
    chat_entry: '💬 Chat Skenario', chat_entry_desc: 'Situasi nyata · latihan dengan AI · belajar sambil mengobrol',
    plan_none: 'Belum berlangganan', plan_trial: 'Uji coba · sisa {n} hari', plan_week: 'Mingguan · sisa {n} hari',
    plan_month: 'Bulanan · sisa {n} hari', plan_active: 'Aktif · sisa {n} hari',
    current_plan: 'Langganan saat ini', choose_plan: 'Pilih paket',
    week_card: 'Mingguan', month_card: 'Bulanan', best_value: 'Paling hemat',
    per_week: '7 hari tanpa batas', per_month: '30 hari tanpa batas',
    week_feat: 'Chat skenario AI\nSemua kursus bergaya game\nPengenalan suara\n18 bahasa ibu (UI & subtitle)',
    month_feat: 'Semua fitur Mingguan\nBiaya harian lebih murah\nFitur baru lebih awal\nMenumpuk saat perpanjang',
    subscribe_btn: 'Berlangganan', or_redeem: 'Atau tukar kode', redeem: 'Tukar',
    code_ph: 'WEEK-XXXX-XXXX',
    expire_at: 'Berlaku s/d: ', service_expired: 'Langganan berakhir. Silakan berlangganan untuk lanjut.',
    opened_local: 'Aktif — paket Anda mulai sekarang.',
    redeem_ok_week: '7 hari aktif', redeem_ok_month: '30 hari aktif', redeem_success: ', penukaran berhasil!',
    pricing_note: 'Pilih paket untuk langsung aktif: akses mulai saat berlangganan. Bisa juga aktif dengan kode (dibuat massal di panel admin). Mingguan = 7×24 jam, bulanan = 30 hari. Berhenti saat habis dan perpanjangan menumpuk.',
    processing: 'Memproses…', order_fail: 'Pesanan gagal', activate_fail: 'Aktivasi gagal', redeem_fail: 'Penukaran gagal',
    mode_course: 'Belajar Kursus', mode_chat: 'Chat Skenario',
    input_ph: 'Tahan mikrofon untuk bicara, atau ketik pesan…',
    online: 'online', typing: 'mengetik…', recognizing: 'mengenali…',
    didnt_hear: 'Tidak terdengar, ulangi ya', recognize_failed: 'Pengenalan gagal',
    replay: '🔊 Putar ulang', sub_expired_alert: 'Langganan berakhir. Silakan berlangganan dulu.', allow_mic: 'Izinkan akses mikrofon',
    goal: 'Tujuan', terms: 'Kata kunci',
    learn_cn: '🇨🇳 Belajar Bahasa Mandarin', xp_label: 'XP',
    unit1: '🌱 Unit 1: Pemula total', unit1d: 'Pinyin · nada · sapaan · 5 pelajaran',
    unit2: '🍜 Unit 2: Kehidupan sehari', unit2d: 'Makan · belanja · bepergian · 5 pelajaran',
    unit3: '💼 Unit 3: Dunia kerja', unit3d: 'Wawancara · pabrik · e-commerce · 4 pelajaran',
    unit4: '📝 Unit 4: Ujian HSK', unit4d: 'Sertifikasi internasional · 3 pelajaran',
    q_listen: '🔊 Dengarkan dan pilih', q_speak: '🎤 Latihan ulang', tap_listen: 'Ketuk 🔊 untuk dengarkan lalu ulangi',
    i_read: 'Sudah baca, lanjut →', choose_answer: 'Pilih jawaban yang benar',
    lesson_done: 'Selesai!', score_label: 'Skor', ai_practice: '💬 Latihan percakapan AI',
    back_courses: 'Kembali ke pelajaran', cont: 'Lanjut',
    err_required: 'Masukkan email dan kata sandi', err_password_short: 'Kata sandi minimal 6 karakter',
    err_invalid_email: 'Format email salah', err_email_exists: 'Email sudah terdaftar, silakan masuk',
    err_account_notfound: 'Akun tidak ditemukan, silakan daftar dulu', err_wrong_password: 'Kata sandi salah',
    err_code_invalid: 'Kode tidak valid', err_code_used: 'Kode ini sudah dipakai',
    err_bad_code_type: 'Tipe kode salah', err_bad_plan: 'Paket salah', err_fail: 'Operasi gagal'
  },

  // ---------------- 泰语 ----------------
  th: {
    app_name: 'คู่หูภาษา AI', tagline: 'ฝึกพูดกับ AI ที่เป็นธรรมชาติเหมือนคนจริง',
    interface_lang: 'ภาษาของหน้าจอ',
    login: 'เข้าสู่ระบบ', register: 'สมัคร', logout: 'ออกจากระบบ', renew: 'ต่ออายุ',
    back: '← ย้อนกลับ', back_home: 'หน้าหลัก',
    email: 'อีเมล', password: 'รหัสผ่าน (อย่างน้อย 6 ตัว)', pw_ph: 'ใส่รหัสผ่าน',
    login_btn: 'เข้าสู่ระบบ', reg_btn: 'สมัครและเริ่มเลย',
    login_tip: 'สมัครรายสัปดาห์/รายเดือน หรือใช้โค้ดเพื่อปลดล็อก',
    loading: 'กำลังโหลด…',
    ai_learning: '🌏 เรียนภาษาด้วย AI', pick_partner: 'เลือกคู่หูแล้วเริ่มเรียนได้เลย',
    my_native: 'ภาษาแม่ของฉัน (คำบรรยาย / คำแปล)', learn_target: 'ฉันอยากเรียน (AI จะพูดภาษานี้)',
    course_entry: '📚 คอร์สเรียน', course_entry_desc: 'บทเรียนสไตล์เกม · สถานการณ์จริง · ตั้งแต่เริ่มต้นถึงขั้นสูง',
    chat_entry: '💬 แชทตามสถานการณ์', chat_entry_desc: 'สถานการณ์จริง · ฝึกกับ AI · เรียนรู้ขณะแชท',
    plan_none: 'ยังไม่สมัคร', plan_trial: 'ทดลอง · เหลือ {n} วัน', plan_week: 'รายสัปดาห์ · เหลือ {n} วัน',
    plan_month: 'รายเดือน · เหลือ {n} วัน', plan_active: 'ใช้งานอยู่ · เหลือ {n} วัน',
    current_plan: 'การสมัครปัจจุบัน', choose_plan: 'เลือกแพ็กเกจ',
    week_card: 'รายสัปดาห์', month_card: 'รายเดือน', best_value: 'คุ้มที่สุด',
    per_week: '7 วันไม่จำกัด', per_month: '30 วันไม่จำกัด',
    week_feat: 'แชทสถานการณ์กับ AI\nคอร์สสไตล์เกมทั้งหมด\nรู้จำเสียงพูด\nรองรับ 18 ภาษาแม่ (UI และคำบรรยาย)',
    month_feat: 'สิทธิ์ทั้งหมดของรายสัปดาห์\nค่าใช้จ่ายต่อวันถูกกว่า\nได้ฟีเจอร์ใหม่ก่อน\nต่ออายุสะสมได้',
    subscribe_btn: 'สมัคร', or_redeem: 'หรือใช้โค้ด', redeem: 'แลก',
    code_ph: 'WEEK-XXXX-XXXX',
    expire_at: 'หมดอายุ: ', service_expired: 'การสมัครหมดอายุ กรุณาสมัครเพื่อใช้งานต่อ',
    opened_local: 'เปิดใช้งานแล้ว เริ่มนับเวลาตั้งแต่ตอนนี้',
    redeem_ok_week: 'เปิดใช้งาน 7 วัน', redeem_ok_month: 'เปิดใช้งาน 30 วัน', redeem_success: ' แลกโค้ดสำเร็จ!',
    pricing_note: 'เลือกแพ็กเกจเพื่อเปิดใช้ทันที เริ่มนับเวลาตอนสมัครสำเร็จ หรือใช้โค้ดเปิดใช้ได้ (สร้างทีละมาก ๆ ในหน้าผู้ดูแล) รายสัปดาห์=7×24 ชม. รายเดือน=30 วัน หยุดอัตโนมัติเมื่อหมดอายุ และการต่ออายุจะสะสมกับเวลาที่เหลือ',
    processing: 'กำลังดำเนินการ…', order_fail: 'สั่งซื้อล้มเหลว', activate_fail: 'เปิดใช้งานล้มเหลว', redeem_fail: 'แลกโค้ดล้มเหลว',
    mode_course: 'บทเรียน', mode_chat: 'แชทตามสถานการณ์',
    input_ph: 'กดไมค์ค้างเพื่อพูด หรือพิมพ์ข้อความ…',
    online: 'ออนไลน์', typing: 'กำลังพิมพ์…', recognizing: 'กำลังรู้จำ…',
    didnt_hear: 'ไม่ได้ยิน กรุณาพูดอีกครั้ง', recognize_failed: 'การรู้จำล้มเหลว',
    replay: '🔊 เล่นซ้ำ', sub_expired_alert: 'การสมัครหมดอายุ กรุณาสมัครก่อน', allow_mic: 'กรุณาอนุญาตไมโครโฟน',
    goal: 'เป้าหมาย', terms: 'คำสำคัญ',
    learn_cn: '🇨🇳 เรียนภาษาจีน', xp_label: 'XP',
    unit1: '🌱 หน่วย 1: เริ่มจากศูนย์', unit1d: 'พินอิน · วรรณยุกต์ · ทักทาย · 5 บทเรียน',
    unit2: '🍜 หน่วย 2: ชีวิตประจำวัน', unit2d: 'กินข้าว · ช้อปปิ้ง · เดินทาง · 5 บทเรียน',
    unit3: '💼 หน่วย 3: ที่ทำงาน', unit3d: 'สัมภาษณ์ · โรงงาน · อีคอมเมิร์ซ · 4 บทเรียน',
    unit4: '📝 หน่วย 4: สอบ HSK', unit4d: 'รับรองระดับสากล · 3 บทเรียน',
    q_listen: '🔊 ฟังแล้วเลือก', q_speak: '🎤 ฝึกพูดตาม', tap_listen: 'แตะ 🔊 เพื่อฟังแล้วพูดตาม',
    i_read: 'อ่านแล้ว ไปต่อ →', choose_answer: 'เลือกคำตอบที่ถูกต้อง',
    lesson_done: 'เสร็จสิ้น!', score_label: 'คะแนน', ai_practice: '💬 ฝึกสนทนากับ AI',
    back_courses: 'กลับไปบทเรียน', cont: 'ดำเนินการต่อ',
    err_required: 'กรุณาใส่อีเมลและรหัสผ่าน', err_password_short: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัว',
    err_invalid_email: 'รูปแบบอีเมลไม่ถูกต้อง', err_email_exists: 'อีเมลนี้สมัครแล้ว กรุณาเข้าสู่ระบบ',
    err_account_notfound: 'ไม่พบบัญชี กรุณาสมัครก่อน', err_wrong_password: 'รหัสผ่านผิด',
    err_code_invalid: 'โค้ดไม่ถูกต้อง', err_code_used: 'โค้ดนี้ถูกใช้แล้ว',
    err_bad_code_type: 'ประเภทโค้ดผิด', err_bad_plan: 'แพ็กเกจผิด', err_fail: 'การดำเนินการล้มเหลว'
  }
};

// ============ 学习进度 / 历史记录 补充文案（合并进各语言） ============
var I18N_EXTRA = {
  en: {
    progress_title: 'Your progress', streak: '🔥 {n}-day streak', lessons_done: '{n} lessons done',
    chats: '{n} chat turns', stat_chats: 'Chat turns', last_study: 'Last study', never_study: 'Start your first lesson today',
    clear_chat: 'Clear', clear_confirm: 'Clear this conversation and start over?',
    best_score: 'Best', completed: 'Done', restart_lesson: 'Practice again', learned_words: '{n} chars practiced',
    continue_from_last: 'Continue where you left off'
  },
  zh: {
    progress_title: '学习进度', streak: '🔥 连续学习 {n} 天', lessons_done: '已完成 {n} 课',
    chats: '对话 {n} 轮', stat_chats: '对话轮次', last_study: '上次学习', never_study: '今天开始第一课吧',
    clear_chat: '清空对话', clear_confirm: '确定清空当前对话、重新开始吗？',
    best_score: '最佳', completed: '已完成', restart_lesson: '再练一次', learned_words: '已练习 {n} 字',
    continue_from_last: '接着上次继续学'
  },
  ja: {
    progress_title: '学習の進捗', streak: '🔥 {n}日連続', lessons_done: '{n}レッスン完了',
    chats: '会話{n}ターン', last_study: '前回の学習', never_study: '今日から最初のレッスンを',
    clear_chat: 'クリア', clear_confirm: 'この会話を消去して最初からやり直しますか？',
    best_score: '最高', completed: '完了', restart_lesson: 'もう一度練習', learned_words: '練習{n}文字',
    continue_from_last: '前回の続きから'
  },
  ko: {
    progress_title: '학습 진행도', streak: '🔥 {n}일 연속', lessons_done: '{n}개 레슨 완료',
    chats: '대화 {n}턴', last_study: '지난 학습', never_study: '오늘 첫 레슨을 시작하세요',
    clear_chat: '지우기', clear_confirm: '이 대화를 지우고 다시 시작할까요?',
    best_score: '최고', completed: '완료', restart_lesson: '다시 연습', learned_words: '연습 {n}자',
    continue_from_last: '이어서 계속하기'
  },
  es: {
    progress_title: 'Tu progreso', streak: '🔥 {n} días seguidos', lessons_done: '{n} lecciones completadas',
    chats: '{n} turnos de chat', last_study: 'Último estudio', never_study: 'Comienza tu primera lección hoy',
    clear_chat: 'Borrar', clear_confirm: '¿Borrar esta conversación y empezar de nuevo?',
    best_score: 'Mejor', completed: 'Hecho', restart_lesson: 'Practicar otra vez', learned_words: '{n} caracteres',
    continue_from_last: 'Continúa donde lo dejaste'
  },
  pt: {
    progress_title: 'Seu progresso', streak: '🔥 {n} dias seguidos', lessons_done: '{n} lições concluídas',
    chats: '{n} turnos de conversa', last_study: 'Último estudo', never_study: 'Comece sua primeira lição hoje',
    clear_chat: 'Limpar', clear_confirm: 'Limpar esta conversa e recomeçar?',
    best_score: 'Melhor', completed: 'Concluído', restart_lesson: 'Praticar de novo', learned_words: '{n} caracteres',
    continue_from_last: 'Continue de onde parou'
  },
  id: {
    progress_title: 'Progres Anda', streak: '🔥 {n} hari berturut', lessons_done: '{n} pelajaran selesai',
    chats: '{n} giliran chat', last_study: 'Belajar terakhir', never_study: 'Mulai pelajaran pertama hari ini',
    clear_chat: 'Hapus', clear_confirm: 'Hapus percakapan ini dan mulai lagi?',
    best_score: 'Terbaik', completed: 'Selesai', restart_lesson: 'Latihan lagi', learned_words: '{n} karakter',
    continue_from_last: 'Lanjutkan dari terakhir'
  },
  th: {
    progress_title: 'ความคืบหน้าของคุณ', streak: '🔥 ต่อเนื่อง {n} วัน', lessons_done: 'เสร็จ {n} บท',
    chats: 'สนทนา {n} ครั้ง', last_study: 'เรียนครั้งก่อน', never_study: 'เริ่มบทแรกวันนี้',
    clear_chat: 'ล้าง', clear_confirm: 'ล้างบทสนทนานี้แล้วเริ่มใหม่ไหม?',
    best_score: 'ดีที่สุด', completed: 'เสร็จแล้ว', restart_lesson: 'ฝึกอีกครั้ง', learned_words: 'ฝึกแล้ว {n} ตัว',
    continue_from_last: 'เรียนต่อจากครั้งก่อน'
  }
};
Object.keys(I18N_EXTRA).forEach(function (l) { if (I18N[l]) Object.assign(I18N[l], I18N_EXTRA[l]); });

// ============ 游戏化题型指令 补充文案 ============
var I18N_GAME = {
  en: { stage_learn:'Grammar point', i_get_it:'Got it, continue →', stage_flash:'Tap a card to flip it', tap_flip:'Tap to flip', know_card:'Know it ✓', dont_know:'Review', stage_pairs:'Match each Chinese word with its meaning', stage_order:'Tap the words in correct order', order_check:'Check', order_reset:'Reset', stage_blank:'Pick the right word for the blank', stage_tf:'True or false?', btn_true:'True ✓', btn_false:'False ✗', stage_categorize:'Pick the right category', stage_choice:'Choose the correct answer', pairs_left:'{n} pairs left', well_done:'Great job!', order_correct:'Correct sentence!', flip_next:'Next card →' },
  zh: { stage_learn:'语法要点', i_get_it:'我懂了，继续 →', stage_flash:'点击卡片翻面学习', tap_flip:'点击翻面', know_card:'认识 ✓', dont_know:'还不熟', stage_pairs:'把中文和对应的意思连起来', stage_order:'按正确语序点词造句', order_check:'检查', order_reset:'重排', stage_blank:'选一个词填入空格', stage_tf:'判断对错', btn_true:'对 ✓', btn_false:'错 ✗', stage_categorize:'选出正确类别', stage_choice:'选出正确答案', pairs_left:'还剩 {n} 对', well_done:'太棒了！', order_correct:'句子正确！', flip_next:'下一张 →' },
  ja: { stage_learn:'文法ポイント', i_get_it:'わかった、次へ →', stage_flash:'カードをタップしてめくる', tap_flip:'タップでめくる', know_card:'知ってる ✓', dont_know:'復習', stage_pairs:'中国語と意味を合わせよう', stage_order:'正しい語順で単語をタップ', order_check:'確認', order_reset:'やり直し', stage_blank:'空欄に合う語を選ぶ', stage_tf:'正誤判定', btn_true:'正 ✓', btn_false:'誤 ✗', stage_categorize:'正しいカテゴリーを選ぶ', stage_choice:'正解を選ぶ', pairs_left:'残り{n}ペア', well_done:'すごい！', order_correct:'正しい文です！', flip_next:'次のカード →' },
  ko: { stage_learn:'문법 포인트', i_get_it:'알겠어요, 다음 →', stage_flash:'카드를 눌러 뒤집기', tap_flip:'눌러서 뒤집기', know_card:'알아요 ✓', dont_know:'복습', stage_pairs:'중국어와 뜻을 짝지으세요', stage_order:'올바른 어순으로 단어 누르기', order_check:'확인', order_reset:'다시', stage_blank:'빈칸에 알맞은 단어 선택', stage_tf:'맞거나 틀림', btn_true:'참 ✓', btn_false:'거짓 ✗', stage_categorize:'알맞은 분류 고르기', stage_choice:'정답 고르기', pairs_left:'남은 짝 {n}개', well_done:'잘했어요!', order_correct:'올바른 문장!', flip_next:'다음 카드 →' },
  es: { stage_learn:'Punto gramatical', i_get_it:'Entendido, continuar →', stage_flash:'Toca una tarjeta para girarla', tap_flip:'Toca para girar', know_card:'Lo sé ✓', dont_know:'Repasar', stage_pairs:'Empareja cada palabra china con su significado', stage_order:'Toca las palabras en el orden correcto', order_check:'Comprobar', order_reset:'Reiniciar', stage_blank:'Elige la palabra correcta', stage_tf:'¿Verdadero o falso?', btn_true:'Verdadero ✓', btn_false:'Falso ✗', stage_categorize:'Elige la categoría', stage_choice:'Elige la respuesta correcta', pairs_left:'Quedan {n} parejas', well_done:'¡Muy bien!', order_correct:'¡Frase correcta!', flip_next:'Siguiente tarjeta →' },
  pt: { stage_learn:'Ponto de gramática', i_get_it:'Entendi, continuar →', stage_flash:'Toque na carta para virar', tap_flip:'Toque para virar', know_card:'Sei ✓', dont_know:'Revisar', stage_pairs:'Ligue cada palavra chinesa ao significado', stage_order:'Toque nas palavras na ordem certa', order_check:'Verificar', order_reset:'Refazer', stage_blank:'Escolha a palavra certa', stage_tf:'Verdadeiro ou falso?', btn_true:'Verdadeiro ✓', btn_false:'Falso ✗', stage_categorize:'Escolha a categoria', stage_choice:'Escolha a resposta certa', pairs_left:'Faltam {n} pares', well_done:'Muito bem!', order_correct:'Frase correta!', flip_next:'Próxima carta →' },
  id: { stage_learn:'Poin tata bahasa', i_get_it:'Saya paham, lanjut →', stage_flash:'Ketuk kartu untuk membalik', tap_flip:'Ketuk untuk membalik', know_card:'Tahu ✓', dont_know:'Ulangi', stage_pairs:'Pasangkan kata Mandarin dengan artinya', stage_order:'Ketuk kata sesuai urutan benar', order_check:'Cek', order_reset:'Ulang', stage_blank:'Pilih kata yang tepat', stage_tf:'Benar atau salah?', btn_true:'Benar ✓', btn_false:'Salah ✗', stage_categorize:'Pilih kategori yang tepat', stage_choice:'Pilih jawaban benar', pairs_left:'Sisa {n} pasang', well_done:'Bagus sekali!', order_correct:'Kalimat benar!', flip_next:'Kartu berikutnya →' },
  th: { stage_learn:'ไวยากรณ์', i_get_it:'เข้าใจแล้ว ต่อไป →', stage_flash:'แตะการ์ดเพื่อพลิก', tap_flip:'แตะเพื่อพลิก', know_card:'รู้แล้ว ✓', dont_know:'ทบทวน', stage_pairs:'จับคู่คำจีนกับความหมาย', stage_order:'แตะคำตามลำดับที่ถูกต้อง', order_check:'ตรวจ', order_reset:'เริ่มใหม่', stage_blank:'เลือกคำที่ถูกเติมช่องว่าง', stage_tf:'ถูกหรือผิด?', btn_true:'ถูก ✓', btn_false:'ผิด ✗', stage_categorize:'เลือกหมวดที่ถูก', stage_choice:'เลือกคำตอบที่ถูก', pairs_left:'เหลือ {n} คู่', well_done:'เก่งมาก!', order_correct:'ประโยคถูกต้อง!', flip_next:'การ์ดถัดไป →' }
};
Object.keys(I18N_GAME).forEach(function (l) { if (I18N[l]) Object.assign(I18N[l], I18N_GAME[l]); });

// ============ 运行时翻译兜底（非预制母语：英文基准串 → 大模型批量翻译，localStorage 缓存） ============
function rtCacheKey(lang) { return 'rt_i18n_' + lang; }
function rtLoad(lang) { try { return JSON.parse(localStorage.getItem(rtCacheKey(lang)) || '{}'); } catch (e) { return {}; } }
function rtSave(lang, dict) { try { localStorage.setItem(rtCacheKey(lang), JSON.stringify(dict)); } catch (e) {} }
var _rtInflight = {};
// 把一批源语言文本翻译到 lang，自动分块、去重、合并并发，结果落本地缓存
function rtFetch(lang, texts, from) {
  from = from || 'en';
  var dict = rtLoad(lang);
  var seen = {}, uniq = [];
  (texts || []).forEach(function (x) {
    x = String(x == null ? '' : x);
    if (x && !Object.prototype.hasOwnProperty.call(dict, x) && !seen[x]) { seen[x] = 1; uniq.push(x); }
  });
  if (!uniq.length) return Promise.resolve(dict);
  var ck = lang + ':' + from;
  if (_rtInflight[ck]) return _rtInflight[ck];
  var chunks = [];
  for (var i = 0; i < uniq.length; i += 60) chunks.push(uniq.slice(i, i + 60));
  var p = chunks.reduce(function (acc, chunk) {
    return acc.then(function () {
      return fetch('/api/translate/batch', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang: lang, from: from, texts: chunk })
      }).then(function (r) { return r.json(); }).then(function (j) {
        var arr = (j && j.translations) || [];
        chunk.forEach(function (src, idx) { if (arr[idx]) dict[src] = arr[idx]; });
        rtSave(lang, dict);
      }).catch(function () {});
    });
  }, Promise.resolve()).then(function () { delete _rtInflight[ck]; return dict; });
  _rtInflight[ck] = p;
  return p;
}
// 收集当前页面全部界面英文基准串，翻译为当前母语后重渲染（课程等动态内容监听 rt-i18n-done 再渲染）
function bootstrapRuntimeI18n() {
  var lang = getUiLang();
  applyI18n();
  if (lang === 'en') return Promise.resolve();
  // 预制语言只补缺失 key；非预制语言翻译整份英文基准
  var texts = Object.keys(I18N.en)
    .filter(function (k) { return !(I18N[lang] && I18N[lang][k] != null); })
    .map(function (k) { return String(I18N.en[k]); })
    .filter(Boolean);
  if (!texts.length) return Promise.resolve();
  return rtFetch(lang, texts, 'en').then(function () {
    applyI18n();
    document.dispatchEvent(new CustomEvent('rt-i18n-done', { detail: { lang: lang } }));
  });
}

function getUiLang() {
  var l = localStorage.getItem(UI_LANG_KEY);
  if (l && UI_LANGS.indexOf(l) >= 0) return l;
  return 'en';
}
function setUiLang(l, persist) {
  if (UI_LANGS.indexOf(l) < 0) l = 'en';
  // 界面语言必须真正生效：applyI18n/t 都从存储读取，因此无论 persist 与否都写入；
  // 否则聊天页/课程页 setUiLang(nativeLang,false) 不会切换界面，残留上一种语言。
  localStorage.setItem(UI_LANG_KEY, l);
  applyI18n();
  bootstrapRuntimeI18n();
  return l;
}
function t(key, vars) {
  var l = getUiLang();
  var s;
  if (I18N[l] && I18N[l][key] != null) {
    s = I18N[l][key];
  } else {
    var base = (I18N.en[key] != null) ? I18N.en[key] : key;
    if (l !== 'en') {
      var dict = rtLoad(l);
      s = Object.prototype.hasOwnProperty.call(dict, String(base)) ? dict[String(base)] : base;
    } else {
      s = base;
    }
  }
  if (vars) Object.keys(vars).forEach(function (k) { s = String(s).split('{' + k + '}').join(vars[k]); });
  return s;
}
function errText(code) { return t('err_' + String(code || 'fail').replace(/^err_/, '')); }
function applyI18n(root) {
  root = root || document;
  root.querySelectorAll('[data-i18n]').forEach(function (el) {
    var key = el.getAttribute('data-i18n');
    var v = t(key);
    if (String(v).indexOf('\n') >= 0 && el.tagName !== 'INPUT') { el.style.whiteSpace = 'pre-line'; }
    el.textContent = v;
  });
  root.querySelectorAll('[data-i18n-ph]').forEach(function (el) { el.placeholder = t(el.getAttribute('data-i18n-ph')); });
  document.documentElement.lang = getUiLang();
}
// 生成界面语言下拉
function buildLangSelect(selectEl, current, onChange) {
  selectEl.innerHTML = '';
  UI_LANGS.forEach(function (code) {
    var o = document.createElement('option');
    o.value = code; o.textContent = UI_LANG_NAMES[code];
    if (code === current) o.selected = true;
    selectEl.appendChild(o);
  });
  selectEl.addEventListener('change', function () { onChange(selectEl.value); });
}
document.addEventListener('DOMContentLoaded', function () { applyI18n(); bootstrapRuntimeI18n(); });
