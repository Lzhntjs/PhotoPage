/* ==========================================================================
   stream.js — 单张滚动模式
   把所有照片扁平化（按系列日期倒序），单列大图纵向滚动
   交互：点击任一图 → 灯箱（全部照片，支持缩放/左右滑动）
   ========================================================================== */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var root = document.getElementById('stream-root');
    if (!root) return;

    var photos = (window.Works && window.Works.allPhotos()) || [];
    if (!photos.length) {
      root.innerHTML = '<p class="text-center text-muted text-sm py-20">No photographs yet.</p>';
      return;
    }

    var html = '';
    photos.forEach(function (p, i) {
      var seriesTitle = p.series ? p.series.title : '';
      var alt = seriesTitle ? (seriesTitle + ' ' + (p.index + 1)) : ('Photo ' + (i + 1));
      var caption = p.caption || '';
      // 系列归属作为副信息（克制的灰色小字）
      if (seriesTitle && !caption) caption = 'From the series ' + seriesTitle;
      html +=
        '<div class="photo reveal" style="transition-delay:' + (i * 50) + 'ms">' +
          '<img class="lazy-img" loading="lazy" alt="' + escapeAttr(alt) + '" data-src="' + escapeAttr(p.src) + '" />' +
          (caption ? '<p class="caption">' + escapeHtml(caption) + '</p>' : '') +
        '</div>';
    });
    root.innerHTML = html;

    /* 点击任一图 → 灯箱（全部照片） */
    var imgs = root.querySelectorAll('.photo img');
    imgs.forEach(function (img, i) {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', function () {
        var items = photos.map(function (p) { return { full: p.src, title: p.series ? p.series.title : '' }; });
        window.Lightbox.open(items, i);
      });
    });

    observe(root);
  });

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
