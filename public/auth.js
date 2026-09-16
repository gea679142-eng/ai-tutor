// ============ 全局账号/订阅 公共脚本 ============
var Auth = {
  tokenKey: 'tutor_token',
  getToken: function () {
    try { var t = localStorage.getItem(this.tokenKey); if (t) return t; } catch (e) {}
    // cookie 后备（手机浏览器清 localStorage 时）
    var m = document.cookie.match(/(?:^|;\s*)tutor_token=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : '';
  },
  setToken: function (t) {
    try { localStorage.setItem(this.tokenKey, t); } catch (e) {}
    // cookie 存 30 天
    document.cookie = 'tutor_token=' + encodeURIComponent(t) + ';path=/;max-age=2592000;samesite=lax';
  },
  clear: function () {
    try { localStorage.removeItem(this.tokenKey); } catch (e) {}
    document.cookie = 'tutor_token=;path=/;max-age=0';
  },

  // 带鉴权的 fetch
  api: function (url, opts) {
    opts = opts || {};
    opts.headers = opts.headers || {};
    if (this.getToken()) opts.headers['Authorization'] = 'Bearer ' + this.getToken();
    return fetch(url, opts).then(function (r) {
      if (r.status === 401) { Auth.clear(); location.replace('/login.html'); throw new Error('login required'); }
      return r;
    });
  },
  post: function (url, body) {
    return this.api(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, data: j }; }); });
  },
  get: function (url) {
    return this.api(url, { method: 'GET' }).then(function (r) { return r.json(); });
  },
  me: function () {
    return this.api('/api/auth/me').then(function (r) { return r.json(); });
  },
  // 页面守卫：未登录跳登录页；返回 user
  guard: function () {
    if (!this.getToken()) { location.replace('/login.html'); return Promise.reject('no token'); }
    var self = this;
    return this.me().then(function (d) {
      if (!d || !d.user) { location.replace('/login.html'); throw new Error('no user'); }
      return d.user;
    });
  },
  // TTS 用 Audio 标签无法带 header，token 走 query
  ttsUrl: function (text, character, lang) {
    return '/api/tts?text=' + encodeURIComponent(text) + '&char=' + character + '&lang=' + lang + '&token=' + encodeURIComponent(this.getToken());
  },
  logout: function () {
    return this.api('/api/auth/logout', { method: 'POST' }).catch(function () {}).then(function () {
      Auth.clear(); location.replace('/login.html');
    });
  },
  // 订阅状态文案（走 i18n，按当前界面语言显示）
  planText: function (sub) {
    if (!sub) return '';
    var tt = (typeof t === 'function') ? t : function (k) { return k; };
    if (!sub.active) return tt('plan_none');
    if (sub.plan === 'trial') return tt('plan_trial', { n: sub.daysLeft });
    if (sub.plan === 'week') return tt('plan_week', { n: sub.daysLeft });
    if (sub.plan === 'month') return tt('plan_month', { n: sub.daysLeft });
    return tt('plan_active', { n: sub.daysLeft });
  },
  fmtDate: function (ts) {
    if (!ts) return '-';
    var d = new Date(ts);
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0') + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  }
};

// ============ 全局导航安全：bfcache 后退守卫 ============
// 退出登录后，浏览器“后退”可能从 bfcache 直接恢复内页而不重新执行 guard；
// 这里在每个引入 auth.js 的页面恢复时校验 token，未登录一律踢回登录/注册页。
window.addEventListener('pageshow', function (e) {
  if (e.persisted && !Auth.getToken()) {
    location.replace('/login.html');
  }
});
