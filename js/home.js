/* ==========================================================================
   home.js — 首页精选系列渲染
   布局：精选系列封面满宽大图，图下左对齐标题+年份（与 Works 列表同款，川内风格）
   ========================================================================== */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var container = document.getElementById('featured');
    if (!container) return;

    var list = (window.Works && window.Works.featured()) || [];
    if (!list.length) {
      // 无精选时退化为全部系列
      list = (window.Works && window.Works.allSeries()) || [];
    }
    if (!list.length) {
      container.innerHTML = '<p class="text-center text-muted text-sm">No featured works yet.</p>';
      return;
    }

    list.forEach(function (s, i) {
      var wrap = document.createElement('a');
      wrap.href = 'series.html?id=' + encodeURIComponent(s.id);
      wrap.className = 'series-card reveal block';
      wrap.style.transitionDelay = (i * 90) + 'ms';
      wrap.innerHTML =
        '<div class="frame">' +
          '<img class="lazy-img" loading="lazy" alt="' + escapeAttr(s.title) + '" data-src="' + escapeAttr(s.cover) + '" />' +
        '</div>' +
        '<div class="series-meta">' +
          '<div class="title">' + escapeHtml(s.title) + '</div>' +
          '<div class="year">' + escapeHtml(String(s.year)) + '</div>' +
        '</div>';
      container.appendChild(wrap);
    });

    observe(container);
  });

  function observe(root) {
    if (!('IntersectionObserver' in window)) {
      root.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
      root.querySelectorAll('img.lazy-img[data-src]').forEach(function (img) { loadImg(img); });
      return;
    }
    var ro = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } });
    }, { threshold: .1 });
    root.querySelectorAll('.reveal').forEach(function (el) { ro.observe(el); });

    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        loadImg(e.target);
        obs.unobserve(e.target);
      });
    }, { rootMargin: '300px 0px' });
    root.querySelectorAll('img.lazy-img[data-src]').forEach(function (el) { io.observe(el); });
  }

  function loadImg(img) {
    img.onerror = function () { this.onerror = null; this.src = window.IMG_FALLBACK; this.classList.add('loaded'); };
    img.addEventListener('load', function () { img.classList.add('loaded'); }, { once: true });
    img.src = img.dataset.src;
    img.removeAttribute('data-src');
    if (img.complete && img.naturalWidth) img.classList.add('loaded');
  }

  function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>]/g, function (c) { return c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'; }); }
  function escapeAttr(s) { return escapeHtml(s).replace(/"/g, '&quot;'); }
})();
