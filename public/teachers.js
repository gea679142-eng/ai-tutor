// ============ 可选 AI 老师头像库（性别 × 风格） ============
var TEACHER_STYLES = [
  { id: 'real', en: 'Realistic', zh: '真人写实' },
  { id: '3d', en: '3D cartoon', zh: '3D 卡通' },
  { id: 'anime', en: 'Anime', zh: '日系动漫' },
  { id: 'illus', en: 'Illustration', zh: '扁平插画' }
];
// id 规则：首字母 f=女 / m=男，下划线后为风格
var TEACHERS = [
  { id: 'f_real', gender: 'female', style: 'real' },
  { id: 'f_3d', gender: 'female', style: '3d' },
  { id: 'f_anime', gender: 'female', style: 'anime' },
  { id: 'f_illus', gender: 'female', style: 'illus' },
  { id: 'm_real', gender: 'male', style: 'real' },
  { id: 'm_3d', gender: 'male', style: '3d' },
  { id: 'm_anime', gender: 'male', style: 'anime' },
  { id: 'm_illus', gender: 'male', style: 'illus' }
];
function teacherImg(id) {
  if (!id) return '/images/xiaomei.jpg';
  var hit = TEACHERS.filter(function (x) { return x.id === id; })[0];
  if (hit) return '/images/teachers/' + id + '.jpg';
  return id.charAt(0) === 'm' ? '/images/xiaoming.jpg' : '/images/xiaomei.jpg';
}
function teacherGender(id) { return id && String(id).charAt(0) === 'm' ? 'male' : 'female'; }
function teachersByGender(g) { return TEACHERS.filter(function (x) { return x.gender === g; }); }
function styleLabel(style) {
  var s = TEACHER_STYLES.filter(function (x) { return x.id === style; })[0];
  if (!s) return style;
  var l = (typeof getUiLang === 'function') ? getUiLang() : 'en';
  if (l === 'zh') return s.zh;
  // 运行时翻译兜底：直接用 i18n key
  var key = 'style_' + (style === '3d' ? '3d' : style);
  if (typeof t === 'function' && I18N.en[key]) return t(key);
  return s.en;
}
