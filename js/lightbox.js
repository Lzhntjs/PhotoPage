/* ==========================================================================
   lightbox.js — 全屏图片浏览灯箱
   功能：高清大图预览、点击缩放、左右切换、键盘控制、移动端滑动
   用法：window.Lightbox.open(items, index)
     - items : [{ full, title, category, ... }] 图片列表
     - index : 起始序号
   ========================================================================== */
(function () {
  'use strict';

  var lb = {
    items: [],
    index: 0,
    zoomed: false,
    el: null,

    /* 创建灯箱 DOM（仅一次） */
    init: function () {
      if (this.el) return;
      var el = document.createElement('div');
      el.className = 'lightbox';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      el.innerHTML =
        '<button class="lb-close" aria-label="Close">&times;</button>' +
        '<button class="lb-nav lb-prev" aria-label="Previous">&#8249;</button>' +
        '<button class="lb-nav lb-next" aria-label="Next">&#8250;</button>' +
        '<div class="lb-stage"><img class="lb-img" alt="" /></div>' +
        '<div class="lb-counter"></div>' +
        '<div class="lb-hint">Click image to zoom &middot; Swipe or use arrows</div>';
      document.body.appendChild(el);
      this.el = el;
      this.img = el.querySelector('.lb-img');
      this.stage = el.querySelector('.lb-stage');
      this.counter = el.querySelector('.lb-counter');

      var self = this;
      el.querySelector('.lb-close').addEventListener('click', function () { self.close(); });
      el.querySelector('.lb-prev').addEventListener('click', function (e) { e.stopPropagation(); self.prev(); });
      el.querySelector('.lb-next').addEventListener('click', function (e) { e.stopPropagation(); self.next(); });
      this.img.addEventListener('click', function (e) { e.stopPropagation(); self.toggleZoom(); });
      el.addEventListener('click', function (e) {
        if (e.target === el || e.target === self.stage) self.close();
      });
      document.addEventListener('keydown', function (e) {
        if (!el.classList.contains('open')) return;
        if (e.key === 'Escape') self.close();
        else if (e.key === 'ArrowLeft') self.prev();
        else if (e.key === 'ArrowRight') self.next();
      });
      this._bindTouch();
    },

    /* 打开灯箱 */
    open: function (items, index) {
      this.init();
      this.items = items || [];
      this.index = Math.max(0, Math.min(index, this.items.length - 1));
      this.zoomed = false;
      this.el.classList.add('open');
      document.body.style.overflow = 'hidden';
      this.render();
    },

    /* 渲染当前图片 */
    render: function () {
      var it = this.items[this.index];
      if (!it) return;
      var img = this.img;
      img.classList.remove('loaded', 'zoomed');
      this.stage.classList.remove('pannable');
      this.zoomed = false;
      img.src = it.full;
      img.alt = it.title || '';
      img.onload = function () { img.classList.add('loaded'); };
      img.onerror = function () { this.onerror = null; this.src = window.IMG_FALLBACK; this.classList.add('loaded'); };
      if (img.complete && img.naturalWidth) img.classList.add('loaded');
      this.counter.textContent = (this.index + 1) + ' / ' + this.items.length;
    },

    next: function () {
      if (!this.items.length) return;
      this.index = (this.index + 1) % this.items.length;
      this.render();
    },

    prev: function () {
      if (!this.items.length) return;
      this.index = (this.index - 1 + this.items.length) % this.items.length;
      this.render();
    },

    close: function () {
      this.el.classList.remove('open');
      document.body.style.overflow = '';
    },

    /* 点击图片在“适应屏幕”与“原始尺寸可拖动查看”间切换 */
    toggleZoom: function () {
      this.zoomed = !this.zoomed;
      this.img.classList.toggle('zoomed', this.zoomed);
      this.stage.classList.toggle('pannable', this.zoomed);
    },

    /* 移动端触摸：左右滑动切换、向下滑动关闭 */
    _bindTouch: function () {
      var sx = 0, sy = 0, dx = 0, dy = 0, moved = false;
      var stage = this.stage;
      var self = this;
      stage.addEventListener('touchstart', function (e) {
        var t = e.touches[0]; sx = t.clientX; sy = t.clientY; dx = 0; dy = 0; moved = false;
      }, { passive: true });
      stage.addEventListener('touchmove', function (e) {
        var t = e.touches[0]; dx = t.clientX - sx; dy = t.clientY - sy; moved = true;
      }, { passive: true });
      stage.addEventListener('touchend', function () {
        if (!moved) return;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
          if (dx < 0) self.next(); else self.prev();
        } else if (Math.abs(dy) > 90 && dy > 0 && !self.zoomed) {
          self.close();
        }
      }, { passive: true });
    }
  };

  window.Lightbox = lb;
})();
