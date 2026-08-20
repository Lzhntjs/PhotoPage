/* ==========================================================================
   home.js — 首页精选作品渲染
   说明：从 data.js 读取 featured 作品，纵向堆叠大图，留白充足，文字极少
   ========================================================================== */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var container = document.getElementById('featured');
    if (!container) return;

    var list = (window.Works && window.Works.featured()) || [];
    if (!list.length) {
      container.innerHTML = '<p class="text-center text-[var(--muted)] text-sm">No featured works yet.</p>';
      return;
    }

    list.forEach(function (w, i) {
      var wrap = document.createElement('a');
      wrap.href = 'work.html?id=' + encodeURIComponent(w.id);
      wrap.className = 'block reveal group';
      wrap.style.transitionDelay = (i * 90) + 'ms';

      wrap.innerHTML =
        '<div class="frame overflow-hidden bg-[var(--paper-2)]">' +
          '<img class="lazy-img w-full h-auto" loading="lazy" alt="' + escapeAttr(w.title) + '" ' +
            'data-src="' + escapeAttr(w.cover) + '" />' +
        '</div>' +
        '<div class="flex items-baseline justify-between mt-5">' +
          '<span class="title text-lg sm:text-xl text-[var(--ink)]">' + escapeHtml(w.title) + '</span>' +
          '<span class="text-xs tracking-wide-2 text-[var(--muted)] uppercase">' + escapeHtml(w.category) + '</span>' +
        '</div>';

      container.appendChild(wrap);
    });

    /* 动态插入的元素需自行观察：进入动画 + 图片懒加载（app.js 早一拍执行时这些节点还不存在） */
    if ('IntersectionObserver' in window) {
      var ro = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { entry.target.classList.add('in'); obs.unobserve(entry.target); }
        });
      }, { threshold: .1 });
      container.querySelectorAll('.reveal').forEach(function (el) { ro.observe(el); });

      var io = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          loadImg(e.target);
          obs.unobserve(e.target);
        });
      }, { rootMargin: '200px 0px' });
      container.querySelectorAll('img.lazy-img[data-src]').forEach(function (el) { io.observe(el); });
    } else {
      container.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
      container.querySelectorAll('img.lazy-img[data-src]').forEach(function (el) { loadImg(el); });
    }

    function loadImg(img) {
      img.onerror = function () { this.onerror = null; this.src = window.IMG_FALLBACK; this.classList.add('loaded'); };
      img.addEventListener('load', function () { img.classList.add('loaded'); }, { once: true });
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
      if (img.complete && img.naturalWidth) img.classList.add('loaded');
    }
  });

  function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>]/g, function (c) { return c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'; }); }
  function escapeAttr(s) { return escapeHtml(s).replace(/"/g, '&quot;'); }
})();
