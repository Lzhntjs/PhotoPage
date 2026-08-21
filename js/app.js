/* ==========================================================================
   app.js — 全站共享逻辑
   职责：移动端菜单、顶栏滚动细线、版权年份、图片懒加载淡入、进入视口动画
   说明：所有页面统一引入，依赖 data.js 已先加载
   ========================================================================== */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {

    /* ---- 版权年份自动计算（起始年-当前年） ---- */
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

    /* ---- 导航当前页高亮（适配 cleanUrls + /works/:id rewrite） ---- */
    var path = location.pathname.replace(/\/+$/, '');
    var file = path.split('/').pop() || 'index.html';
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      var target = a.getAttribute('data-nav');
      var isActive = false;
      if (target === 'home')    isActive = (file === 'index.html' || file === '' || file === 'index');
      else if (target === 'works')  isActive = (file === 'works.html' || file === 'works' || file === 'series.html' || path.indexOf('/works/') === 0);
      else if (target === 'stream') isActive = (file === 'stream.html' || file === 'stream');
      else if (target === 'about')  isActive = (file === 'about.html' || file === 'about');
      if (isActive) {
        a.classList.add('opacity-60');
        a.setAttribute('aria-current', 'page');
      }
    });

    /* ---- 顶栏滚动时出现细分割线 ---- */
    var header = document.querySelector('.site-header');
    if (header) {
      var onScroll = function () {
        header.classList.toggle('scrolled', window.scrollY > 8);
      };
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    /* ---- 川内风格侧边栏：Menu 开 / Close 关 / 遮罩关 / ESC 关 ---- */
    var drawer  = document.querySelector('.nav-drawer');
    var overlay = document.querySelector('.nav-overlay');
    var openBtn = document.querySelector('[data-menu-toggle]');
    var closeBtn = drawer ? drawer.querySelector('.nav-close') : null;

    function openNav() {
      if (!drawer || !overlay) return;
      drawer.classList.add('open');
      overlay.classList.add('open');
      document.body.classList.add('nav-open');
    }
    function closeNav() {
      if (!drawer || !overlay) return;
      drawer.classList.remove('open');
      overlay.classList.remove('open');
      document.body.classList.remove('nav-open');
    }

    if (openBtn)   openBtn.addEventListener('click', openNav);
    if (closeBtn)  closeBtn.addEventListener('click', closeNav);
    if (overlay)   overlay.addEventListener('click', closeNav);
    // 点侧边栏内任一导航项后自动收起
    if (drawer) {
      drawer.querySelectorAll('nav a').forEach(function (a) {
        a.addEventListener('click', closeNav);
      });
    }
    // ESC 键关闭
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer && drawer.classList.contains('open')) closeNav();
    });

    /* ---- 图片懒加载淡入：依赖原生 loading=lazy + IntersectionObserver ---- */
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
            // 兜底：若缓存命中 load 已触发
            if (img.complete) img.classList.add('loaded');
            obs.unobserve(img);
          }
        });
      }, { rootMargin: '200px 0px' });
      lazyImgs.forEach(function (img) { io.observe(img); });
    } else {
      // 不支持时直接加载
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
})();
