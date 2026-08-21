/* ==========================================================================
   series.js — 系列详情页渲染
   读取 ?id= 渲染该系列：标题+年份+元数据，下方单列大图纵向滚动（川内详情页风格）
   交互：点击任一图 → 灯箱（本系列照片列表，支持缩放/左右滑动）
   说明：URL 经 Vercel rewrite 为 /works/<id>，本地直接 series.html?id=<id>
   ========================================================================== */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var root = document.getElementById('series-root');
    if (!root) return;

    var id = new URLSearchParams(location.search).get('id');
    var s = id && window.Works && window.Works.byId(id);

    if (!s) {
      root.innerHTML =
        '<div class="text-center section-breathe">' +
          '<p class="title text-2xl text-[var(--muted)]">Series not found.</p>' +
          '<a href="works" class="back-link inline-block mt-6">&larr; Back to Works</a>' +
        '</div>';
      return;
    }

    document.title = s.title + ' — ' + window.SITE.name;

    /* 元数据行（仅展示非空字段） */
    var meta = '';
    if (s.date)      meta += metaRow('Date', formatDate(s.date));
    if (s.location)  meta += metaRow('Location', s.location);
    if (s.camera || s.lens) meta += metaRow('Camera & Lens', [s.camera, s.lens].filter(Boolean).join(' · '));
    if (s.notes)     meta += metaRow('Notes', s.notes);

    /* 照片列表（单列大图纵向滚动） */
    var photosHtml = '';
    s.photos.forEach(function (p, i) {
      photosHtml +=
        '<div class="photo reveal" style="transition-delay:' + (i * 60) + 'ms">' +
          '<img class="lazy-img" loading="lazy" alt="' + escapeAttr(s.title + ' ' + (i + 1)) + '" data-src="' + escapeAttr(p.src) + '" />' +
          (p.caption ? '<p class="caption">' + escapeHtml(p.caption) + '</p>' : '') +
        '</div>';
    });

    root.innerHTML =
      '<a href="works" class="back-link reveal">&larr; Works</a>' +
      '<div class="reveal mt-8">' +
        '<h1 class="title text-4xl sm:text-6xl">' + escapeHtml(s.title) + '</h1>' +
        '<div class="year mt-2 text-sm text-muted">' + escapeHtml(String(s.year)) + '</div>' +
      '</div>' +
      (meta ? '<div class="reveal mt-10 max-w-[var(--maxw-text)]">' + meta + '</div>' : '') +
      '<div class="single-column mt-16">' + photosHtml + '</div>';

    /* 点击任一图打开灯箱（本系列照片） */
    var imgs = root.querySelectorAll('.photo img');
    imgs.forEach(function (img, i) {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', function () {
        var items = s.photos.map(function (p) { return { full: p.src, title: s.title }; });
        window.Lightbox.open(items, i);
      });
    });

    observe(root);
  });

  function metaRow(label, value) {
    return '<div class="meta-row">' +
      '<div class="meta-label">' + escapeHtml(label) + '</div>' +
      '<div class="flex-1 text-[var(--ink)] leading-relaxed">' + escapeHtml(value) + '</div>' +
    '</div>';
  }

  function formatDate(d) {
    var dt = new Date(d);
    if (isNaN(dt)) return d;
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[dt.getMonth()] + ' ' + dt.getFullYear();
  }

  function observe(root) {
    if (!('IntersectionObserver' in window)) {
      root.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
      root.querySelectorAll('img.lazy-img[data-src]').forEach(function (img) { loadImg(img); });
      return;
    }
    var ro = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } });
    }, { threshold: .08 });
    root.querySelectorAll('.reveal').forEach(function (el) { ro.observe(el); });

    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        loadImg(e.target);
        obs.unobserve(e.target);
      });
    }, { rootMargin: '400px 0px' });
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
