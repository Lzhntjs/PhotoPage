/* ==========================================================================
   app.js — 全站共享逻辑
   职责：侧边栏渲染（作品系列列表）、移动端汉堡菜单、当前页高亮、版权年份、图片懒加载、进入视口动画
   说明：所有页面统一引入，依赖 data.js 已先加载
   ========================================================================== */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {

    /* ---- 版权年份自动计算 ---- */
    var yearEls = document.querySelectorAll('[data-year]');
    var now = new Date().getFullYear();
    yearEls.forEach(function (el) {
      var start = parseInt(el.dataset.year, 10) || now;
      el.textContent = (start === now) ? String(now) : (start + '–' + now);
    });

    /* ---- 作者署名自动填充 ---- */
    document.querySelectorAll('[data-author]').forEach(function (el) {
      el.textContent = (window.SITE && window.SITE.author) || '';
    });

    /* ---- 动态渲染作品系列列表到侧边栏 ---- */
    var seriesList = document.getElementById('sidebar-series-list');
    if (seriesList && window.Works) {
      var series = window.Works.allSeries();
      var html = '';
      series.forEach(function (s) {
        html += '<a href="series.html?id=' + encodeURIComponent(s.id) + '" data-series="' + escapeAttr(s.id) + '">' + escapeHtml(s.title) + '</a>';
      });
      seriesList.innerHTML = html;

      // 高亮当前系列
      var params = new URLSearchParams(location.search);
      var currentId = params.get('id');
      if (currentId) {
        var currentLink = seriesList.querySelector('[data-series="' + currentId + '"]');
        if (currentLink) {
          currentLink.classList.add('active');
          currentLink.setAttribute('aria-current', 'page');
        }
      }
    }

    /* ---- 导航当前页高亮 ---- */
    var path = location.pathname.replace(/\/+$/, '');
    var file = path.split('/').pop() || 'index.html';
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      var target = a.getAttribute('data-nav');
      var isActive = false;
      if (target === 'home')    isActive = (file === 'index.html' || file === '' || file === 'index');
      else if (target === 'works')  isActive = (file === 'works.html' || file === 'works' || file === 'series.html' || file === 'series');
      else if (target === 'stream') isActive = (file === 'stream.html' || file === 'stream');
      else if (target === 'about')  isActive = (file === 'about.html' || file === 'about');
      if (isActive) {
        a.classList.add('active');
        a.setAttribute('aria-current', 'page');
      }
    });

    /* ---- 移动端汉堡菜单：侧边栏展开/收起 ---- */
    var toggleBtn = document.querySelector('[data-sidebar-toggle]');
    var sidebar = document.querySelector('.app-sidebar');
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', function () {
        sidebar.classList.toggle('mobile-open');
        toggleBtn.textContent = sidebar.classList.contains('mobile-open') ? 'Close' : 'Menu';
      });
      // 点击导航项后自动收起（移动端）
      sidebar.querySelectorAll('.sidebar-nav a').forEach(function (a) {
        a.addEventListener('click', function () {
          if (sidebar.classList.contains('mobile-open')) {
            sidebar.classList.remove('mobile-open');
            toggleBtn.textContent = 'Menu';
          }
        });
      });
    }

    /* ---- 图片懒加载淡入 ---- */
    var lazyImgs = document.querySelectorAll('img.lazy-img[data-src]');
    if ('IntersectionObserver' in window && lazyImgs.length) {
      var io = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var img = entry.target;
            img.onerror = function () { this.onerror = null; this.src = window.IMG_FALLBACK; this.classList.add('loaded'); };
            img.addEventListener('load', function () { img.classList.add('loaded'); }, { once: true });
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            if (img.complete) img.classList.add('loaded');
            obs.unobserve(img);
          }
        });
      }, { rootMargin: '200px 0px' });
      lazyImgs.forEach(function (img) { io.observe(img); });
    } else {
      lazyImgs.forEach(function (img) {
        img.src = img.dataset.src;
        img.classList.add('loaded');
      });
    }

    /* ---- 进入视口缓慢上浮动画 ---- */
    var reveals = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window && reveals.length) {
      var ro = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: .12 });
      reveals.forEach(function (el) { ro.observe(el); });
    } else {
      reveals.forEach(function (el) { el.classList.add('in'); });
    }
  });

  function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>]/g, function (c) { return c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'; }); }
  function escapeAttr(s) { return escapeHtml(s).replace(/"/g, '&quot;'); }
})();
