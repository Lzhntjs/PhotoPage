/* ==========================================================================
   LucaLiu Photography — Works Data（作品元数据"数据库"）
   --------------------------------------------------------------------------
   三层结构：分类(Category) → 系列(Series) → 照片(Photo)
   --------------------------------------------------------------------------
   ★ 你日常只维护这个文件。新增/删除/修改作品，只改 window.SERIES，
    无需动任何前端代码，提交后 Vercel 自动重新部署。
   --------------------------------------------------------------------------
   系列字段说明：
     id        系列唯一标识（英文+数字，用于详情页 URL /works/<id>）
     title     系列标题（英文，列表页展示）
     year      系列年份（展示在标题下方）
     category  分类，四者之一：Landscape / Travel / Street / Portrait
     date      拍摄日期 YYYY-MM-DD（用于排序）
     location  拍摄地点（留给你自行填写，可留空 ""）
     camera    相机型号（留给你自行填写，可留空 ""）
     lens      镜头型号（留给你自行填写，可留空 ""）
     notes     创作文案（留给你自行填写，可留空 ""）
     cover     列表页封面/缩略图：仓库内 images/thumbnails/ 的小图（长边1920px）
     full      灯箱/详情页大图 URL：Cloudflare R2 的大图（长边3000px）
     featured  设为 true 时，该系列在首页精选区展示
     photos    该系列内的照片列表，每项 { src, caption } ：
                 src     单张照片大图 URL（R2 或本地占位）
                 caption 单张照片说明（可选，留给你填写）
   --------------------------------------------------------------------------
   ★ 图片存储规则（重要）：
     - cover  仓库内小图（长边≤1920px），保证构建包不超 Vercel 250MB
     - full   R2 大图 URL（长边3000px），网页只引用不打包
     - 当前为"占位模式"：cover/full 都指向本地路径，仓库不存图，
       网页打开时图片位置显示柔和占位块；R2 配好后重跑
       prepare_images.py --r2-base https://media.你的域名.com 即可切到 R2
   ========================================================================== */

window.SERIES = [
  {
    "id": "film",
    "title": "Film",
    "year": 2026,
    "category": "Street",
    "date": "2026-08-20",
    "location": "",
    "camera": "",
    "lens": "",
    "notes": "",
    "cover": "images/thumbnails/film-01.jpg",
    "full": "images/thumbnails/film-01.jpg",
    "featured": true,
    "photos": [
      {
        "src": "images/thumbnails/film-01.jpg",
        "caption": ""
      },
      {
        "src": "images/thumbnails/film-02.jpg",
        "caption": ""
      },
      {
        "src": "images/thumbnails/film-03.jpg",
        "caption": ""
      },
      {
        "src": "images/thumbnails/film-04.jpg",
        "caption": ""
      }
    ]
  },
  {
    "id": "sydney",
    "title": "Sydney",
    "year": 2026,
    "category": "Travel",
    "date": "2026-08-20",
    "location": "",
    "camera": "",
    "lens": "",
    "notes": "",
    "cover": "images/thumbnails/sydney-01.jpg",
    "full": "images/thumbnails/sydney-01.jpg",
    "featured": true,
    "photos": [
      {
        "src": "images/thumbnails/sydney-01.jpg",
        "caption": ""
      },
      {
        "src": "images/thumbnails/sydney-02.jpg",
        "caption": ""
      },
      {
        "src": "images/thumbnails/sydney-03.jpg",
        "caption": ""
      },
      {
        "src": "images/thumbnails/sydney-04.jpg",
        "caption": ""
      },
      {
        "src": "images/thumbnails/sydney-05.jpg",
        "caption": ""
      },
      {
        "src": "images/thumbnails/sydney-06.jpg",
        "caption": ""
      }
    ]
  },
  {
    "id": "takamatsu",
    "title": "Takamatsu",
    "year": 2026,
    "category": "Travel",
    "date": "2026-08-20",
    "location": "",
    "camera": "",
    "lens": "",
    "notes": "",
    "cover": "images/thumbnails/takamatsu-01.jpg",
    "full": "images/thumbnails/takamatsu-01.jpg",
    "featured": false,
    "photos": [
      {
        "src": "images/thumbnails/takamatsu-01.jpg",
        "caption": ""
      },
      {
        "src": "images/thumbnails/takamatsu-02.jpg",
        "caption": ""
      },
      {
        "src": "images/thumbnails/takamatsu-03.jpg",
        "caption": ""
      }
    ]
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
  social: []
};

/* --------------------------------------------------------------------------
   数据访问辅助方法（供各页面 JS 调用，集中维护避免重复）
   -------------------------------------------------------------------------- */
window.Works = {
  allSeries: function () {
    // 全部系列，按日期倒序（新→旧）
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
  // 所有照片扁平列表（用于 Stream 单张滚动模式），按系列日期倒序
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
