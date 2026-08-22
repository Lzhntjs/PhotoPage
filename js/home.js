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
      
      // 先把新图片设置到 overlay（保持 opacity: 0）
      overlay.src = photo.src;
      overlay.style.opacity = '0';
      
      // 强制浏览器预加载图片（读取尺寸触发加载）
      var tempImg = new Image();
      tempImg.onload = function () {
        // 图片已缓存，现在可以安全切换
        // 强制浏览器重排，确保 opacity: 0 生效
        void overlay.offsetWidth;
        
        // 同步执行：主图淡出 + overlay 淡入
        img.style.opacity = '0';
        overlay.style.opacity = '1';

        // 600ms 后完成切换
        setTimeout(function () {
          // 关键：先设置 src，但保持 opacity 不变（主图仍然是 0）
          // 这样浏览器在后台解码图片，用户看不到
          var oldSrc = img.src;
          img.src = photo.src;
          
          // 等浏览器处理完 src 后，在下一帧显示主图
          requestAnimationFrame(function () {
            // 现在主图的新 src 已经准备好，可以安全显示
            img.style.opacity = '1';
            
            // 再等一帧，淡出 overlay 并清理
            requestAnimationFrame(function () {
              overlay.style.opacity = '0';
              // 确保主图和 overlay 的 src 相同后再清空 overlay
              if (img.src === photo.src) {
                overlay.src = '';
              }
              state.isAnimating = false;
            });
          });
        }, 600);
      };
      tempImg.src = photo.src;
    } else {
      img.src = photo.src;
      img.style.opacity = '1';
      overlay.style.opacity = '0';
      overlay.src = '';
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
