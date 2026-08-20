/* ==========================================================================
   LucaLiu Photography — Works Data（作品元数据“数据库”）
   --------------------------------------------------------------------------
   这是整站唯一需要你维护的内容文件。新增 / 删除 / 修改作品，只需编辑本文件，
   无需改动任何前端代码，提交后 Vercel 自动重新部署即可。
   --------------------------------------------------------------------------
   字段说明：
     id        作品唯一标识（英文+数字，用于详情页 URL ?id=xxx）
     title     作品标题（英文，界面展示用）
     category  分类，必须为四者之一：Landscape / Travel / Street / Portrait
     date      拍摄日期，格式 YYYY-MM-DD
     location  拍摄地点（留给你自行填写，可留空 "" ）
     camera    相机型号（留给你自行填写，可留空 "" ）
     lens      镜头型号（留给你自行填写，可留空 "" ）
     notes     创作文案（留给你自行填写，可留空 "" ）
     cover     封面/缩略图路径：存放在仓库内 images/thumbnails/ 的小图
     full      高清大图 URL：存放在 Cloudflare R2 的大图
     featured  设为 true 时，该作品在首页精选区展示
   --------------------------------------------------------------------------
   ★ 图片存储规则（重要）：
     - cover  用仓库内的小图（长边 1920px 以内），保证构建包不超 Vercel 250MB 限制
     - full   用 R2 大图 URL（长边 3000px），网页只引用不打包
     - 下面示例先用占位图 URL 演示效果；正式使用时按 README 替换为你的真实地址
   ========================================================================== */

window.WORKS = [
  {
    "id": "film-01",
    "title": "Film 01",
    "category": "Street",
    "date": "2026-08-20",
    "location": "",
    "camera": "",
    "lens": "",
    "notes": "",
    "cover": "images/thumbnails/film-01.jpg",
    "full": "images/thumbnails/film-01.jpg",
    "featured": true
  },
  {
    "id": "film-02",
    "title": "Film 02",
    "category": "Street",
    "date": "2026-08-20",
    "location": "",
    "camera": "",
    "lens": "",
    "notes": "",
    "cover": "images/thumbnails/film-02.jpg",
    "full": "images/thumbnails/film-02.jpg",
    "featured": false
  },
  {
    "id": "film-03",
    "title": "Film 03",
    "category": "Street",
    "date": "2026-08-20",
    "location": "",
    "camera": "",
    "lens": "",
    "notes": "",
    "cover": "images/thumbnails/film-03.jpg",
    "full": "images/thumbnails/film-03.jpg",
    "featured": false
  },
  {
    "id": "film-04",
    "title": "Film 04",
    "category": "Street",
    "date": "2026-08-20",
    "location": "",
    "camera": "",
    "lens": "",
    "notes": "",
    "cover": "images/thumbnails/film-04.jpg",
    "full": "images/thumbnails/film-04.jpg",
    "featured": false
  },
  {
    "id": "sydney-01",
    "title": "Sydney 01",
    "category": "Travel",
    "date": "2026-08-20",
    "location": "",
    "camera": "",
    "lens": "",
    "notes": "",
    "cover": "images/thumbnails/sydney-01.jpg",
    "full": "images/thumbnails/sydney-01.jpg",
    "featured": true
  },
  {
    "id": "sydney-02",
    "title": "Sydney 02",
    "category": "Travel",
    "date": "2026-08-20",
    "location": "",
    "camera": "",
    "lens": "",
    "notes": "",
    "cover": "images/thumbnails/sydney-02.jpg",
    "full": "images/thumbnails/sydney-02.jpg",
    "featured": false
  },
  {
    "id": "sydney-03",
    "title": "Sydney 03",
    "category": "Travel",
    "date": "2026-08-20",
    "location": "",
    "camera": "",
    "lens": "",
    "notes": "",
    "cover": "images/thumbnails/sydney-03.jpg",
    "full": "images/thumbnails/sydney-03.jpg",
    "featured": false
  },
  {
    "id": "sydney-04",
    "title": "Sydney 04",
    "category": "Travel",
    "date": "2026-08-20",
    "location": "",
    "camera": "",
    "lens": "",
    "notes": "",
    "cover": "images/thumbnails/sydney-04.jpg",
    "full": "images/thumbnails/sydney-04.jpg",
    "featured": false
  },
  {
    "id": "sydney-05",
    "title": "Sydney 05",
    "category": "Travel",
    "date": "2026-08-20",
    "location": "",
    "camera": "",
    "lens": "",
    "notes": "",
    "cover": "images/thumbnails/sydney-05.jpg",
    "full": "images/thumbnails/sydney-05.jpg",
    "featured": false
  },
  {
    "id": "sydney-06",
    "title": "Sydney 06",
    "category": "Travel",
    "date": "2026-08-20",
    "location": "",
    "camera": "",
    "lens": "",
    "notes": "",
    "cover": "images/thumbnails/sydney-06.jpg",
    "full": "images/thumbnails/sydney-06.jpg",
    "featured": false
  },
  {
    "id": "takamatsu-01",
    "title": "Takamatsu 01",
    "category": "Travel",
    "date": "2026-08-20",
    "location": "",
    "camera": "",
    "lens": "",
    "notes": "",
    "cover": "images/thumbnails/takamatsu-01.jpg",
    "full": "images/thumbnails/takamatsu-01.jpg",
    "featured": false
  },
  {
    "id": "takamatsu-02",
    "title": "Takamatsu 02",
    "category": "Travel",
    "date": "2026-08-20",
    "location": "",
    "camera": "",
    "lens": "",
    "notes": "",
    "cover": "images/thumbnails/takamatsu-02.jpg",
    "full": "images/thumbnails/takamatsu-02.jpg",
    "featured": false
  },
  {
    "id": "takamatsu-03",
    "title": "Takamatsu 03",
    "category": "Travel",
    "date": "2026-08-20",
    "location": "",
    "camera": "",
    "lens": "",
    "notes": "",
    "cover": "images/thumbnails/takamatsu-03.jpg",
    "full": "images/thumbnails/takamatsu-03.jpg",
    "featured": false
  }
];

/* --------------------------------------------------------------------------
   图片加载失败时的柔和占位图（艺术站点风格的浅灰块，避免裂图突兀）
   -------------------------------------------------------------------------- */
window.IMG_FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'%3E%3Crect width='4' height='3' fill='%23ECEAE4'/%3E%3C/svg%3E";

/* --------------------------------------------------------------------------
   站点信息（页脚版权、导航等共用，统一维护）
   -------------------------------------------------------------------------- */
window.SITE = {
  name: "LucaLiu Photography",
  author: "Luca Liu",
  startYear: 2024,
  // 版权年份会在 app.js 中自动计算为 起始年-当前年
  social: [
    // 预留社交入口，留空则不显示；不需要可整项删除
  ]
};

/* --------------------------------------------------------------------------
   数据访问辅助方法（供各页面 JS 调用，集中维护避免重复）
   -------------------------------------------------------------------------- */
window.Works = {
  all: function () {
    return window.WORKS.slice();
  },
  byId: function (id) {
    return window.WORKS.find(function (w) { return w.id === id; });
  },
  byCategory: function (cat) {
    if (!cat || cat === "All") return window.WORKS.slice();
    return window.WORKS.filter(function (w) { return w.category === cat; });
  },
  featured: function () {
    return window.WORKS.filter(function (w) { return w.featured; });
  },
  categories: function () {
    return ["Landscape", "Travel", "Street", "Portrait"];
  }
};
