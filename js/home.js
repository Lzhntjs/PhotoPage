/* ==========================================================================
   home.js — 首页：左侧导航 + 右侧全屏单图
   ========================================================================== */
(function () {
  'use strict';

  var state = {
    photos: [],
    currentIdx: 0,
    isAnimating: false
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

  function showPhoto(idx, instant) {
    state.currentIdx = idx;
    var photo = state.photos[idx];
    if (!photo) return;

    // 更新标题信息
    var titleEl = document.getElementById('home-series-title');
    var yearEl = document.getElementById('home-series-year');
    if (titleEl) titleEl.textContent = photo.title;
    if (yearEl) yearEl.textContent = String(photo.year);

    // 切换图片（无缝交叉淡入淡出）
    var img = document.getElementById('home-stage-img');
    var overlay = document.getElementById('home-stage-img-overlay');

    if (!instant && !state.isAnimating) {
      state.isAnimating = true;
      
      // 预加载新图片到 overlay
      var tempImg = new Image();
      tempImg.onload = function () {
        overlay.src = photo.src;
        // 同步执行：主图淡出 + overlay 淡入
        img.classList.add('fade-out');
        overlay.classList.add('fade-in');

        // 600ms 后完成切换
        setTimeout(function () {
          img.src = photo.src;
          img.classList.remove('fade-out');
          overlay.classList.remove('fade-in');
          overlay.src = '';
          state.isAnimating = false;
        }, 600);
      };
      tempImg.src = photo.src;
    } else {
      img.src = photo.src;
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

    // 点击图片切换下一张
    var img = document.getElementById('home-stage-img');
    if (img) {
      img.addEventListener('click', function(e) {
        e.stopPropagation();
        nextPhoto();
      });
    }
    var imgOverlay = document.getElementById('home-stage-img-overlay');
    if (imgOverlay) {
      imgOverlay.addEventListener('click', function(e) {
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
