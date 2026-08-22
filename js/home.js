/* ==========================================================================
   home.js — 首页：左侧导航 + 右侧全屏单图
   ========================================================================== */
(function () {
  'use strict';

  var state = {
    photos: [],
    currentIdx: 0,
    isAnimating: false,
    activeIdx: 0  // 当前显示的是哪个 img 元素（0 = home-stage-img, 1 = home-stage-img-overlay）
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (!window.Works) return;

    // 收集所有作品的第一张照片作为轮播图
    var allSeries = window.Works.allSeries();
    allSeries.forEach(function (s) {
      if (s.photos && s.photos.length) {
        state.photos.push({
          src: s.photos[0].src || s.cover,
          seriesId: s.id,
          title: s.title,
          year: s.year
        });
      }
    });

    if (!state.photos.length) return;

    showPhoto(0, true);
    bindEvents();
  });

  function getImgs() {
    return [
      document.getElementById('home-stage-img'),       // 元素 0
      document.getElementById('home-stage-img-overlay') // 元素 1
    ];
  }

  function showPhoto(idx, instant) {
    state.currentIdx = idx;
    var photo = state.photos[idx];
    if (!photo) return;

    // 更新标题信息
    var titleEl = document.getElementById('home-series-title');
    var yearEl = document.getElementById('home-series-year');
    if (titleEl) titleEl.textContent = photo.title;
    if (yearEl) yearEl.textContent = String(photo.year);

    var imgs = getImgs();
    var activeImg = imgs[state.activeIdx];
    var hiddenImg = imgs[1 - state.activeIdx];

    if (instant) {
      // 初始化：直接设置两个图片
      activeImg.src = photo.src;
      activeImg.style.opacity = '1';
      hiddenImg.src = '';
      hiddenImg.style.opacity = '0';
    } else if (!state.isAnimating && activeImg.src !== photo.src) {
      state.isAnimating = true;

      // 关键：只修改"隐藏"图片的 src，可见图片的 src 永远不变
      hiddenImg.src = photo.src;
      hiddenImg.style.opacity = '0';

      // 预加载确保图片已缓存
      var preload = new Image();
      preload.onload = function () {
        // 强制浏览器重排，确保 opacity: 0 生效
        void hiddenImg.offsetWidth;

        // 交叉淡入淡出：隐藏图片淡入，显示图片淡出
        activeImg.style.opacity = '0';
        hiddenImg.style.opacity = '1';

        // 600ms 后完成切换
        setTimeout(function () {
          // 交换角色：刚才淡入的图片成为新的 active
          state.activeIdx = 1 - state.activeIdx;
          
          // 现在新的 active 就是 hiddenImg，它的 src 已经是新图片
          // 新的 hidden 是原来的 active，它还保留着旧 src
          
          // 清理旧图片（现在是 hidden）
          var newHidden = imgs[1 - state.activeIdx];
          newHidden.src = '';
          newHidden.style.opacity = '0';
          
          state.isAnimating = false;
        }, 600);
      };
      preload.src = photo.src;
    }

    updateArrows();
  }

  function nextPhoto() {
    if (state.photos.length < 2) return;
    var next = (state.currentIdx + 1) % state.photos.length;
    showPhoto(next);
  }

  function prevPhoto() {
    if (state.photos.length < 2) return;
    var prev = (state.currentIdx - 1 + state.photos.length) % state.photos.length;
    showPhoto(prev);
  }

  function updateArrows() {
    var hasMultiple = state.photos.length > 1;
    var prev = document.getElementById('home-prev');
    var next = document.getElementById('home-next');
    if (prev) prev.style.opacity = hasMultiple ? '1' : '0.3';
    if (next) next.style.opacity = hasMultiple ? '1' : '0.3';
  }

  function bindEvents() {
    document.getElementById('home-prev').addEventListener('click', function(e) {
      e.stopPropagation();
      prevPhoto();
    });
    document.getElementById('home-next').addEventListener('click', function(e) {
      e.stopPropagation();
      nextPhoto();
    });

    // 点击图片切换 - 绑定到包裹容器上，这样两个图片元素都能响应
    var imgWrap = document.querySelector('.home-stage-img-wrap');
    if (imgWrap) {
      imgWrap.addEventListener('click', function(e) {
        e.stopPropagation();
        nextPhoto();
      });
    }

    // 键盘支持
    document.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') prevPhoto();
      else if (e.key === 'ArrowRight') nextPhoto();
    });

    // 触摸滑动支持
    var stage = document.querySelector('.home-stage');
    if (stage) {
      var touchStartX = 0;
      stage.addEventListener('touchstart', function (e) {
        touchStartX = e.touches[0].clientX;
      }, { passive: true });

      stage.addEventListener('touchend', function (e) {
        var dx = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(dx) > 60) {
          if (dx < 0) nextPhoto();
          else prevPhoto();
        }
      });
    }
  }
})();
