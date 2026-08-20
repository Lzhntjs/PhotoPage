/* ==========================================================================
   work.js — 作品详情页渲染
   功能：读取 ?id= 渲染大图 + 元数据（Date/Location/Camera & Lens/Notes）
   交互：点击大图打开灯箱（同分类作品列表，支持缩放与左右滑动）
         底部 Prev / Next 在同分类内切换相邻作品
   ========================================================================== */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var root = document.getElementById('work-root');
    if (!root) return;

    var id = new URLSearchParams(location.search).get('id');
    var work = id && window.Works && window.Works.byId(id);

    if (!work) {
      root.innerHTML =
        '<div class="text-center section-breathe">' +
          '<p class="title text-xl text-[var(--muted)]">Work not found.</p>' +
          '<a href="gallery.html" class="link-quiet inline-block mt-6 text-sm tracking-wide-2 uppercase">Back to Gallery</a>' +
        '</div>';
      return;
    }

    /* 同分类作品列表与当前位置 */
    var sibs = (window.Works.byCategory(work.category)) || [];
    var pos = sibs.findIndex(function (w) { return w.id === work.id; });
    var prev = pos > 0 ? sibs[pos - 1] : null;
    var next = pos < sibs.length - 1 ? sibs[pos + 1] : null;

    /* 文档标题 */
    document.title = work.title + ' — ' + window.SITE.name;

    /* 组装元数据行（仅展示非空字段） */
    var meta = '';
    if (work.date)     meta += metaRow('Date', formatDate(work.date));
    if (work.location)  meta += metaRow('Location', work.location);
    if (work.camera || work.lens) meta += metaRow('Camera & Lens', [work.camera, work.lens].filter(Boolean).join(' · '));
    if (work.notes)     meta += metaRow('Notes', work.notes);

    root.innerHTML =
      '<div class="reveal">' +
        '<a href="gallery.html?cat=' + encodeURIComponent(work.category) + '" class="link-quiet text-xs tracking-wide-2 uppercase text-[var(--muted)]">&larr; ' + escapeHtml(work.category) + '</a>' +
      '</div>' +

      '<div class="reveal mt-6">' +
        '<h1 class="title text-3xl sm:text-4xl text-[var(--ink)]">' + escapeHtml(work.title) + '</h1>' +
      '</div>' +

      /* 主图：点击打开灯箱 */
      '<div class="reveal mt-10">' +
        '<div class="frame cursor-zoom-in overflow-hidden bg-[var(--paper-2)]" id="main-image">' +
          '<img class="lazy-img w-full h-auto" alt="' + escapeAttr(work.title) + '" data-src="' + escapeAttr(work.full) + '" />' +
        '</div>' +
        '<p class="text-xs tracking-wide-2 text-[var(--muted)] uppercase mt-3">Click image to view in full</p>' +
      '</div>' +

      (meta ? '<div class="reveal mt-12 max-w-xl">' + meta + '</div>' : '') +

      /* Prev / Next 切换 */
      '<div class="reveal mt-20 pt-10 border-t border-[var(--line)] flex items-center justify-between">' +
        navCell(prev, 'Previous', false) +
        navCell(next, 'Next', true) +
      '</div>';

    /* 主图点击 → 灯箱（同分类作品列表） */
    var mainImg = document.getElementById('main-image');
    if (mainImg) {
      mainImg.addEventListener('click', function () {
        window.Lightbox.open(sibs, Math.max(0, pos));
      });
    }

    /* 动画 + 懒加载 */
    observe(root);
  });

  function navCell(w, label, right) {
    if (!w) return '<span></span>';
    var align = right ? 'text-right' : '';
    return '<a href="work.html?id=' + encodeURIComponent(w.id) + '" class="group block ' + align + '">' +
      '<span class="block text-[11px] tracking-wide-2 uppercase text-[var(--muted)] mb-1">' + label + '</span>' +
      '<span class="title text-base sm:text-lg text-[var(--ink)] transition-opacity duration-500 group-hover:opacity-60">' + escapeHtml(w.title) + '</span>' +
    '</a>';
  }

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
    var reveals = root.querySelectorAll('.reveal');
    var imgs = root.querySelectorAll('img.lazy-img[data-src]');
    if (!('IntersectionObserver' in window)) {
      reveals.forEach(function (el) { el.classList.add('in'); });
      imgs.forEach(function (el) { el.src = el.dataset.src; el.classList.add('loaded'); });
      return;
    }
    var ro = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } });
    }, { threshold: .1 });
    reveals.forEach(function (el) { ro.observe(el); });
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var img = e.target;
        img.onerror = function () { this.onerror = null; this.src = window.IMG_FALLBACK; this.classList.add('loaded'); };
        img.addEventListener('load', function () { img.classList.add('loaded'); }, { once: true });
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        if (img.complete && img.naturalWidth) img.classList.add('loaded');
        obs.unobserve(img);
      });
    }, { rootMargin: '200px 0px' });
    imgs.forEach(function (el) { io.observe(el); });
  }

  function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>]/g, function (c) { return c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'; }); }
  function escapeAttr(s) { return escapeHtml(s).replace(/"/g, '&quot;'); }
})();
