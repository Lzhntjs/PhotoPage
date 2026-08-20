/* ==========================================================================
   gallery.js — 相册页渲染
   功能：分类筛选（All / Landscape / Travel / Street / Portrait）+ 瀑布流网格
   交互：点击作品图卡 → 跳转作品详情页 work.html?id=
   说明：支持 ?cat=Landscape 预选分类
   ========================================================================== */
(function () {
  'use strict';

  var CATS = ["All", "Landscape", "Travel", "Street", "Portrait"];
  var current = "All";

  document.addEventListener('DOMContentLoaded', function () {
    var filterBar = document.getElementById('filter');
    var grid = document.getElementById('gallery-grid');
    if (!grid) return;

    /* 从 URL 预选分类 */
    var params = new URLSearchParams(location.search);
    var preset = params.get('cat');
    if (preset && CATS.indexOf(preset) > -1) current = preset;

    /* 渲染筛选条 */
    if (filterBar) {
      CATS.forEach(function (cat) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = cat;
        btn.dataset.cat = cat;
        btn.className = 'filter-btn link-quiet text-sm tracking-wide-2 uppercase pb-1 ' +
          (cat === current ? 'is-active' : 'text-[var(--muted)]');
        btn.addEventListener('click', function () {
          current = cat;
          filterBar.querySelectorAll('.filter-btn').forEach(function (b) {
            b.classList.toggle('is-active', b.dataset.cat === current);
            b.classList.toggle('text-[var(--muted)]', b.dataset.cat !== current);
          });
          renderGrid();
        });
        filterBar.appendChild(btn);
      });
    }

    renderGrid();
  });

  function renderGrid() {
    var grid = document.getElementById('gallery-grid');
    grid.innerHTML = '';
    var list = (window.Works && window.Works.byCategory(current)) || [];
    if (!list.length) {
      grid.innerHTML = '<p class="text-center text-[var(--muted)] text-sm py-20">No works in this collection yet.</p>';
      return;
    }
    list.forEach(function (w, i) {
      var card = document.createElement('a');
      card.href = 'work.html?id=' + encodeURIComponent(w.id);
      card.className = 'work-card reveal block break-inside-avoid mb-12';
      card.style.transitionDelay = (i * 70) + 'ms';
      card.innerHTML =
        '<div class="frame">' +
          '<img class="lazy-img w-full h-auto" loading="lazy" alt="' + escapeAttr(w.title) + '" data-src="' + escapeAttr(w.cover) + '" />' +
        '</div>' +
        '<div class="flex items-baseline justify-between mt-4">' +
          '<span class="title text-base text-[var(--ink)]">' + escapeHtml(w.title) + '</span>' +
          '<span class="text-[11px] tracking-wide-2 text-[var(--muted)] uppercase">' + escapeHtml(w.category) + '</span>' +
        '</div>';
      grid.appendChild(card);
    });

    /* 动画 + 懒加载观察 */
    observeNew(grid);
  }

  function observeNew(root) {
    if (!('IntersectionObserver' in window)) {
      root.querySelectorAll('.reveal,.lazy-img[data-src]').forEach(function (el) {
        if (el.classList.contains('lazy-img') && el.dataset.src) { el.src = el.dataset.src; }
        el.classList.add('in', 'loaded');
      });
      return;
    }
    var revObs = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); }
      });
    }, { threshold: .1 });
    root.querySelectorAll('.reveal').forEach(function (el) { revObs.observe(el); });

    var imgObs = new IntersectionObserver(function (entries, obs) {
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
    root.querySelectorAll('img.lazy-img[data-src]').forEach(function (el) { imgObs.observe(el); });
  }

  function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>]/g, function (c) { return c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'; }); }
  function escapeAttr(s) { return escapeHtml(s).replace(/"/g, '&quot;'); }
})();
