// ============ 全站通用动效（GSAP，缺失时静默降级到 CSS） ============
(function () {
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function hasGsap() { return !REDUCED && typeof window.gsap !== 'undefined'; }

  // 入场：[data-fx] 元素分层 stagger（轻微上浮 + 淡入 + 极轻模糊，电影感但克制）
  function playEntrance(scope) {
    var root = scope || document;
    var els = Array.prototype.slice.call(root.querySelectorAll('[data-fx]'));
    if (!els.length) return;
    if (!hasGsap()) { els.forEach(function (e) { e.style.opacity = 1; }); return; }
    gsap.killTweensOf(els);
    gsap.fromTo(els,
      { y: 28, opacity: 0, scale: .985, filter: 'blur(6px)' },
      { y: 0, opacity: 1, scale: 1, filter: 'blur(0px)', duration: .6, ease: 'power3.out',
        stagger: .05, clearProps: 'transform,opacity,filter', delay: .04 });
    // 安全兜底：无论动画是否被中断，900ms 后强制清除可能残留的隐藏内联样式，杜绝白屏
    setTimeout(function () {
      els.forEach(function (e) { e.style.opacity = ''; e.style.filter = ''; e.style.transform = ''; });
    }, 900);
  }

  // 单个元素弹入（新消息气泡、动态卡片等）
  function pop(el) {
    if (!el) return;
    if (hasGsap()) {
      gsap.killTweensOf(el);
      gsap.fromTo(el, { y: 14, opacity: 0, scale: .96 },
        { y: 0, opacity: 1, scale: 1, duration: .34, ease: 'back.out(1.5)', clearProps: 'transform,opacity' });
    }
    // 无 GSAP 时不做任何"从0开始"的动画，元素保持默认可见，杜绝卡透明帧
  }

  // 数字滚动（XP / 连击 / 统计）
  function countUp(el, to, opts) {
    if (!el) return;
    opts = opts || {};
    var from = parseFloat(el.getAttribute('data-fx-num')) || 0;
    to = Number(to) || 0;
    el.setAttribute('data-fx-num', to);
    if (REDUCED || !hasGsap()) { el.textContent = (opts.prefix || '') + to + (opts.suffix || ''); return; }
    var o = { v: from };
    gsap.to(o, {
      v: to, duration: opts.duration || .8, ease: 'power2.out',
      onUpdate: function () { el.textContent = (opts.prefix || '') + Math.round(o.v) + (opts.suffix || ''); }
    });
  }

  // 涟漪 + 按压反馈（事件委托，覆盖动态生成元素）
  function bindPress() {
    var SEL = '.btn, .teacher-card, .iconbtn, .choice, .seg, .entry, .opt, .node, .ptile, .tf-btn';
    document.addEventListener('pointerdown', function (ev) {
      var t = ev.target.closest(SEL);
      if (!t) return;
      if (hasGsap()) gsap.to(t, { scale: .96, duration: .09, ease: 'power1.out' });
      if (!REDUCED) ripple(t, ev);
    }, { passive: true });
    var release = function (ev) {
      var t = ev.target.closest(SEL);
      if (t && hasGsap()) gsap.to(t, { scale: 1, duration: .18, ease: 'back.out(2.2)' });
    };
    document.addEventListener('pointerup', release, { passive: true });
    document.addEventListener('pointercancel', release, { passive: true });
  }
  function ripple(t, ev) {
    try {
      var rect = t.getBoundingClientRect();
      var size = Math.max(rect.width, rect.height) * 1.1;
      var ink = document.createElement('span');
      ink.className = 'fx-ink';
      ink.style.width = ink.style.height = size + 'px';
      var x = (ev.clientX || rect.left + rect.width / 2) - rect.left - size / 2;
      var y = (ev.clientY || rect.top + rect.height / 2) - rect.top - size / 2;
      ink.style.left = x + 'px'; ink.style.top = y + 'px';
      var cs = getComputedStyle(t);
      if (cs.position === 'static') t.style.position = 'relative';
      t.style.overflow = 'hidden';
      t.appendChild(ink);
      setTimeout(function () { ink.remove(); }, 600);
    } catch (e) {}
  }

  window.FX = { playEntrance: playEntrance, pop: pop, countUp: countUp, hasGsap: hasGsap };

  document.addEventListener('DOMContentLoaded', function () {
    bindPress();
    setTimeout(function () { playEntrance(); }, 30);
  });
})();
