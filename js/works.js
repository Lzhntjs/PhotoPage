/* ==========================================================================
   works.js — 作品总览渲染
   布局：分类作为次级标题，其下是该分类的系列封面列表（川内风格单列大图）
   交互：点击系列封面 → 跳转 /works/<id>（经 Vercel rewrite 到 series.html?id=）
   ========================================================================== */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var root = document.getElementById('works-list');
    if (!root) return;

    var cats = window.Works.categories();
    var html = '';

    cats.forEach(function (cat) {
      var series = window.Works.byCategory(cat);
      if (!series.length) return;  // 该分类无作品则不显示该次级标题

      html += '<h2 class="category-heading reveal">' + escapeHtml(cat) +
              '<span class="count">' + series.length + (series.length > 1 ? ' series' : ' series') + '</span></h2>';

      html += '<div class="works-list">';
      series.forEach(function (s, i) {
        var href;
        // 本地预览（无 rewrite）用 series.html?id=；Vercel 上用 /works/<id>
        // 统一用 /works/<id>，本地 python server 也能解析（series.html 同目录）
        // 为兼容本地 file:// 与 python server，这里用相对路径 works/<id>
        href = 'works/' + encodeURIComponent(s.id);
        html +=
          '<a href="' + href + '" class="series-card reveal block" style="transition-delay:' + (i * 80) + 'ms">' +
            '<div class="frame">' +
              '<img class="lazy-img" loading="lazy" alt="' + escapeAttr(s.title) + '" data-src="' + escapeAttr(s.cover) + '" />' +
            '</div>' +
            '<div class="series-meta">' +
              '<div class="title">' + escapeHtml(s.title) + '</div>' +
              '<div class="year">' + escapeHtml(String(s.year)) + '</div>' +
            '</div>' +
          '</a>';
      });
      html += '</div>';
    });

    if (!html) {
      html = '<p class="text-center text-muted text-sm py-20">No works yet.</p>';
    }
    root.innerHTML = html;

    observe(root);
  });

  /* 动画 + 懒加载观察（与各页面一致） */
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
