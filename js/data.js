/* ==========================================================================
   LucaLiu Photography — Works Data
   --------------------------------------------------------------------------
   数据来源（优先级）：
   1. R2 上的 manifest.json（远程，去中心化维护）
   2. 下方的 FALLBACK_SERIES（本地兜底，离线/开发用）
   --------------------------------------------------------------------------
   ★ 日常维护方式：
     在 R2 存储桶根目录放置 manifest.json，格式见项目根目录 manifest.json
     网站启动时自动从 R2 拉取，无需推送代码到 GitHub
   ========================================================================== */

/* ---- R2 manifest 地址 ---- */
var MANIFEST_URL = 'https://pub-90fa7196a28e419894e73529296c0b5c.r2.dev/manifest.json';

/* ---- 本地兜底数据（离线/开发/R2 未配置时使用）---- */
var FALLBACK_SERIES = [
  {
    "id": "noncata",
    "title": "Noncata",
    "year": 2025,
    "category": "Travel",
    "date": "2025-02-20",
    "location": "",
    "camera": "",
    "lens": "",
    "notes": "",
    "cover": "https://pub-90fa7196a28e419894e73529296c0b5c.r2.dev/thumbs/noncata-01.jpg",
    "full": "https://pub-90fa7196a28e419894e73529296c0b5c.r2.dev/noncata-01.jpg",
    "featured": true,
    "photos": [
      { "src": "https://pub-90fa7196a28e419894e73529296c0b5c.r2.dev/noncata-01.jpg", "caption": "" },
      { "src": "https://pub-90fa7196a28e419894e73529296c0b5c.r2.dev/noncata-02.jpg", "caption": "" },
      { "src": "https://pub-90fa7196a28e419894e73529296c0b5c.r2.dev/noncata-03.jpg", "caption": "" }
    ]
  },
  {
    "id": "randomlife",
    "title": "RandomLife",
    "year": 2025,
    "category": "Travel",
    "date": "2025-04-20",
    "location": "",
    "camera": "",
    "lens": "",
    "notes": "",
    "cover": "https://pub-90fa7196a28e419894e73529296c0b5c.r2.dev/thumbs/randomlife-01.jpg",
    "full": "https://pub-90fa7196a28e419894e73529296c0b5c.r2.dev/randomlife-01.jpg",
    "featured": false,
    "photos": [
      { "src": "https://pub-90fa7196a28e419894e73529296c0b5c.r2.dev/randomlife-01.jpg", "caption": "" },
      { "src": "https://pub-90fa7196a28e419894e73529296c0b5c.r2.dev/randomlife-02.jpg", "caption": "" },
      { "src": "https://pub-90fa7196a28e419894e73529296c0b5c.r2.dev/randomlife-03.jpg", "caption": "" }
    ]
  },
  {
    "id": "sydney",
    "title": "Sydney",
    "year": 2015,
    "category": "Travel",
    "date": "2015-01-06",
    "location": "",
    "camera": "",
    "lens": "",
    "notes": "",
    "cover": "https://pub-90fa7196a28e419894e73529296c0b5c.r2.dev/thumbs/sydney-01.jpg",
    "full": "https://pub-90fa7196a28e419894e73529296c0b5c.r2.dev/sydney-01.jpg",
    "featured": false,
    "photos": [
      { "src": "https://pub-90fa7196a28e419894e73529296c0b5c.r2.dev/sydney-01.jpg", "caption": "" },
      { "src": "https://pub-90fa7196a28e419894e73529296c0b5c.r2.dev/sydney-02.jpg", "caption": "" },
      { "src": "https://pub-90fa7196a28e419894e73529296c0b5c.r2.dev/sydney-03.jpg", "caption": "" },
      { "src": "https://pub-90fa7196a28e419894e73529296c0b5c.r2.dev/sydney-04.jpg", "caption": "" },
      { "src": "https://pub-90fa7196a28e419894e73529296c0b5c.r2.dev/sydney-05.jpg", "caption": "" }
    ]
  }
];

/* ---- 初始化全局数据（先用兜底数据，异步加载后覆盖）---- */
window.SERIES = FALLBACK_SERIES.slice();

window.IMG_FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'%3E%3Crect width='4' height='3' fill='%23ECEAE4'/%3E%3C/svg%3E";

window.SITE = {
  name: "LucaLiu Photography",
  author: "Luca Liu",
  startYear: 2024,
  social: []
};

window.Works = {
  allSeries: function () {
    return window.SERIES.slice().sort(function (a, b) {
      return (b.date || '').localeCompare(a.date || '');
    });
  },
  byId: function (id) {
    return window.SERIES.find(function (s) { return s.id === id; });
  },
  byCategory: function (cat) {
    return this.allSeries().filter(function (s) { return s.category === cat; });
  },
  featured: function () {
    return this.allSeries().filter(function (s) { return s.featured; });
  },
  categories: function () {
    return ["Landscape", "Travel", "Street", "Portrait"];
  },
  allPhotos: function () {
    var out = [];
    this.allSeries().forEach(function (s) {
      s.photos.forEach(function (p, i) {
        out.push({
          src: p.src,
          caption: p.caption || '',
          series: s,
          index: i
        });
      });
    });
    return out;
  }
};

/* ---- 异步从 R2 加载 manifest.json ----
   window.WorksReady 是一个 Promise：
   - resolve 后，window.SERIES 和 window.SITE 已更新为 R2 上的最新数据
   - 如果 R2 不可达，resolve 兜底数据（不 reject）
   各页面 JS 通过 window.WorksReady.then(init) 等待数据就绪
*/
window.WorksReady = new Promise(function (resolve) {
  fetch(MANIFEST_URL, { cache: 'no-cache' })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      if (data && data.series && data.series.length) {
        // 用 R2 数据覆盖兜底数据
        window.SERIES.length = 0;
        data.series.forEach(function (s) { window.SERIES.push(s); });
      }
      if (data && data.site) {
        Object.keys(data.site).forEach(function (k) {
          window.SITE[k] = data.site[k];
        });
      }
      console.log('[Works] Manifest loaded from R2');
      resolve();
    })
    .catch(function (err) {
      console.log('[Works] Using fallback data:', err.message);
      resolve(); // 不 reject，用兜底数据继续
    });
});
