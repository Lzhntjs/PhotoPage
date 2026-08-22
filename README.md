# LucaLiu Photography

一套**轻量化纯静态摄影画册网站**。安静、克制、大量留白，参考川内伦子的艺术气质，原创实现。

- 架构：HTML5 + CSS3 + 原生 JS + Tailwind CSS（CDN，零构建）
- 无后端、无数据库、无服务器、无实时服务依赖 → 极致稳定、零运维
- 混合图片存储：Cloudflare R2 存缩略图和高清大图
- 托管：Cloudflare Pages 自动部署（国内访问友好）

---

## 目录

1. [项目结构](#1-项目结构)
2. [本地预览](#2-本地预览)
3. [部署与技术栈](#3-部署与技术栈)
4. [R2 图片存储规则](#4-r2-图片存储规则)
5. [日常维护手册](#5-日常维护手册)
   - 5.1 新增图片到已有系列
   - 5.2 创建新系列/新分类
   - 5.3 删除图片或系列
   - 5.4 修改作品信息
   - 5.5 调整网站风格
6. [完整工作流示例](#6-完整工作流示例)
   - 6.1 处理一批新照片的完整流程
7. [R2 管理最佳实践](#7-r2-管理最佳实践)
8. [免费额度与避坑清单](#8-免费额度与避坑清单)

---

## 1. 项目结构

```
photopage/
├── index.html              首页（全屏轮播图，点击切换）
├── works.html              作品列表页（分类筛选 + 网格）
├── series.html             系列详情页（大图浏览）
├── stream.html             时间线流（单张滚动）
├── about.html              关于页
├── css/
│   └── style.css           全局样式、响应式设计、动画
├── js/
│   ├── data.js             ★ 作品元数据"数据库"（日常主要维护这个）
│   ├── home.js             首页逻辑（图片切换、键盘/触摸支持）
│   ├── works.js            作品列表页逻辑
│   ├── series.js           系列详情页逻辑
│   ├── stream.js           时间线流逻辑
│   ├── lightbox.js         全屏灯箱
│   └── app.js              全站共享逻辑
├── tools/
│   ├── prepare_images.py   ★ 批量处理照片脚本（缩略图+大图+更新data.js）
│   └── upload_to_r2.py     ★ 批量上传到R2脚本
├── images/
│   └── thumbnails/         本地缩略图目录（临时使用）
├── photofile/              ★ 原图存放目录（你放照片的地方）
└── .gitignore
```

### 关键文件说明

| 文件 | 作用 | 你是否需要修改 |
|------|------|---------------|
| `js/data.js` | 存储所有系列和照片的元数据 | ✅ 日常维护主要改这个 |
| `tools/prepare_images.py` | 批量处理原图生成网站资源 | ✅ 可修改分类映射 |
| `tools/upload_to_r2.py` | 上传处理好的图片到R2 | ❌ 配置好后不用改 |
| `css/style.css` | 网站样式 | ❌ 一般不用改 |
| `*.html` | 页面结构 | ❌ 一般不用改 |

---

## 2. 本地预览

```bash
# macOS
cd /Users/liuzihao/Documents/Creative/Photography/photopage
python3 -m http.server 8000
```

浏览器打开 `http://localhost:8000` 即可预览。

---

## 3. 部署与技术栈

### 当前部署方案

| 服务 | 用途 | 链接 |
|------|------|------|
| GitHub | 代码托管 | github.com/Lzhntjs/PhotoPage |
| Cloudflare Pages | 网站部署 | photopage-8dh.pages.dev |
| Cloudflare R2 | 图片存储 | 存储桶：lucaliu-photos |

### 自动部署机制

```
git push → GitHub main branch → Cloudflare Pages 自动部署
```

每次推送代码到 GitHub，Cloudflare Pages 会自动拉取最新代码并部署，无需手动操作。

---

## 4. R2 图片存储规则

### 存储桶结构

```
lucaliu-photos/
├── thumbs/           1920px 缩略图（用于封面、网格预览）
│   ├── noncata-01.jpg
│   ├── noncata-02.jpg
│   └── ...
└── (根目录)          3000px 高清大图（用于详情页、灯箱）
    ├── noncata-01.jpg
    ├── noncata-02.jpg
    └── ...
```

### 命名规则

- 缩略图和大图使用**相同文件名**
- 格式：`{系列ID}-{序号}.jpg`
- 示例：`sydney-01.jpg`, `randomlife-01.jpg`

### URL 格式

```
缩略图: https://pub-xxx.r2.dev/thumbs/{文件名}
大图:   https://pub-xxx.r2.dev/{文件名}
```

### data.js 中的引用

```javascript
{
  id: "sydney",
  // ...
  cover: "https://pub-xxx.r2.dev/thumbs/sydney-01.jpg",  // 封面用缩略图
  photos: [
    { src: "https://pub-xxx.r2.dev/sydney-01.jpg" },     // 详情页用大图
    { src: "https://pub-xxx.r2.dev/sydney-02.jpg" }
  ]
}
```

---

## 5. 日常维护手册

### 5.1 新增图片到已有系列

#### 场景：给 "Sydney" 系列添加新照片

**步骤 1：准备原图**
- 把新照片放入 `photofile/Sydney/` 文件夹
- 文件命名建议按顺序：`IMG_001.jpg`, `IMG_002.jpg` 等

**步骤 2：运行处理脚本**
```bash
cd /Users/liuzihao/Documents/Creative/Photography/photopage
python3 tools/prepare_images.py --r2-base https://pub-90fa7196a28e419894e73529296c0b5c.r2.dev
```

脚本会自动：
- 读取 `photofile/Sydney/` 中所有图片
- 生成 1920px 缩略图到 `images/thumbnails/`
- 生成 3000px 大图到 `r2-upload/`
- 更新 `js/data.js` 中的 series 数据

**步骤 3：上传到 R2**
```bash
# 设置环境变量（首次需要）
export R2_ACCOUNT_ID="你的account_id"
export R2_ACCESS_KEY="你的access_key"
export R2_SECRET_KEY="你的secret_key"
export R2_BUCKET="lucaliu-photos"

# 执行上传
python3 tools/upload_to_r2.py
```

**步骤 4：检查并微调 data.js**
打开 `js/data.js`，检查新添加的系列数据，手动修改：
- `title`：系列标题
- `year`：年份
- `category`：分类（Landscape/Travel/Street/Portrait）
- `date`：日期
- `location`：地点（可选）
- `camera`：相机（可选）
- `lens`：镜头（可选）
- `notes`：说明文字（可选）
- `featured`：是否在首页展示（true/false）

**步骤 5：提交到 GitHub**
```bash
cd /Users/liuzihao/Documents/Creative/Photography/photopage
git add -A
git commit -m "Add new photos to Sydney series"
git push origin main
```

Cloudflare Pages 会自动部署，等待 1-2 分钟后刷新网页即可看到更新。

---

### 5.2 创建新系列/新分类

#### 场景：创建一个新的 "Tokyo" 系列

**步骤 1：创建文件夹并放入原图**
```
photofile/Tokyo/
├── IMG_001.jpg
├── IMG_002.jpg
└── ...
```

**步骤 2：修改分类映射（如果需要新分类）**
打开 `tools/prepare_images.py`，找到 `FOLDER_CATEGORY` 字典：

```python
FOLDER_CATEGORY = {
    "Film": "Street",
    "Sydney": "Travel",
    "Takamatsu": "Travel",
    "Tokyo": "Travel",  # ← 添加新映射
}
DEFAULT_CATEGORY = "Travel"
```

**步骤 3：运行处理脚本**
```bash
python3 tools/prepare_images.py --r2-base https://pub-xxx.r2.dev
```

**步骤 4：上传到 R2**
```bash
python3 tools/upload_to_r2.py
```

**步骤 5：编辑 data.js**
打开 `js/data.js`，找到新生成的 series 对象，补全信息：

```javascript
{
  "id": "tokyo",
  "title": "Tokyo",
  "year": 2025,
  "category": "Travel",
  "date": "2025-05-01",
  "location": "Tokyo, Japan",
  "camera": "",
  "lens": "",
  "notes": "",
  "cover": "https://pub-xxx.r2.dev/thumbs/tokyo-01.jpg",
  "full": "https://pub-xxx.r2.dev/tokyo-01.jpg",
  "featured": true,  // 如果想在首页展示
  "photos": [
    { "src": "https://pub-xxx.r2.dev/tokyo-01.jpg", "caption": "" },
    { "src": "https://pub-xxx.r2.dev/tokyo-02.jpg", "caption": "" }
  ]
}
```

**步骤 6：提交到 GitHub**
```bash
git add -A
git commit -m "Add new Tokyo series"
git push origin main
```

#### 添加新分类

当前支持的分类：`Landscape`, `Travel`, `Street`, `Portrait`

如需添加新分类（如 `Architecture`）：
1. 在 `js/data.js` 的 `Works.categories()` 方法中添加：
```javascript
categories: function () {
  return ["Landscape", "Travel", "Street", "Portrait", "Architecture"];
}
```
2. 在 `tools/prepare_images.py` 的 `FOLDER_CATEGORY` 中使用新分类

---

### 5.3 删除图片或系列

#### 删除单张图片

1. 打开 `js/data.js`
2. 找到对应 series 的 `photos` 数组
3. 删除要移除的照片对象
4. 同时更新 `cover` 为该系列剩余照片的第一张
5. 提交到 GitHub

#### 删除整个系列

1. 打开 `js/data.js`
2. 找到对应的 series 对象
3. 删除整个对象（注意数组逗号）
4. 提交到 GitHub

#### 清理 R2 上的图片（可选）

如果确定不再需要，可以在 Cloudflare Dashboard 删除 R2 上的文件：
- 访问 Cloudflare → R2 → `lucaliu-photos`
- 分别在 `thumbs/` 和根目录删除对应的 `.jpg` 文件

---

### 5.4 修改作品信息

直接编辑 `js/data.js` 中对应 series 对象的字段：

```javascript
{
  "id": "sydney",
  "title": "Sydney",           // 修改标题
  "year": 2023,                 // 修改年份
  "category": "Travel",         // 修改分类
  "date": "2023-03-15",        // 修改日期
  "location": "Sydney, Australia",  // 添加地点
  "camera": "Fujifilm X-T5",   // 添加相机
  "lens": "16-80mm F4",        // 添加镜头
  "notes": "A trip to Sydney...",  // 添加说明
  "featured": true               // 设为首页展示
}
```

提交后自动部署即可。

---

### 5.5 调整网站风格

#### 修改颜色/字体

打开 `css/style.css`，顶部的 CSS 变量：

```css
:root {
  --paper: #FAFAF7;   /* 背景色 */
  --ink:   #2B2B28;   /* 主文字色 */
  --muted: #9A9A92;   /* 次级文字色 */
  --accent: #C87E5C;  /* 强调色 */
}
```

#### 修改首页布局

编辑 `index.html` 和 `js/home.js`。

#### 添加新页面

复制现有的 `.html` 文件作为模板，修改内容后提交。

---

## 6. 完整工作流示例

### 6.1 处理一批新照片的完整流程

#### 场景：从相机导入 20 张照片创建 "Beijing 2025" 系列

```bash
# 第 1 步：准备原图
mkdir -p photofile/Beijing2025
# 把相机照片复制到 photofile/Beijing2025/

# 第 2 步：安装依赖（首次）
pip install pillow rawpy boto3

# 第 3 步：运行处理脚本
python3 tools/prepare_images.py \
  --r2-base https://pub-90fa7196a28e419894e73529296c0b5c.r2.dev

# 第 4 步：上传到 R2
export R2_ACCOUNT_ID="xxx"
export R2_ACCESS_KEY="xxx"
export R2_SECRET_KEY="xxx"
export R2_BUCKET="lucaliu-photos"
python3 tools/upload_to_r2.py

# 第 5 步：编辑 js/data.js
# 打开文件，找到 "beijing2025" series，补全信息

# 第 6 步：本地预览
python3 -m http.server 8000
# 浏览器访问 http://localhost:8000 检查效果

# 第 7 步：提交部署
git add -A
git commit -m "Add Beijing 2025 series (20 photos)"
git push origin main

# 第 8 步：等待 Cloudflare Pages 自动部署（约 1-2 分钟）
```

---

## 7. R2 管理最佳实践

### 文件组织

- ✅ **保持命名一致**：`{series-id}-{seq}.jpg`，如 `sydney-01.jpg`
- ✅ **同系列连续编号**：01, 02, 03...
- ❌ **避免特殊字符**：不用中文、空格、特殊符号
- ❌ **不要重复编号**：不同系列的文件允许重名（如都有 `-01`）

### 图片规格

| 类型 | 长边 | 质量 | 用途 |
|------|------|------|------|
| 缩略图 | 1920px | 86% | 列表页封面、网格 |
| 大图 | 3000px | 88% | 详情页、灯箱 |

### 缓存策略

脚本已设置长期缓存（`CacheControl: "public, max-age=31536000, immutable"`），更新图片后如需刷新缓存：
- 在 Cloudflare Dashboard 删除对应文件再重新上传
- 或在 data.js 中修改引用 URL 添加查询参数：`?v=2`

### R2 API Token 安全

- ✅ 使用 Object Read & Write 权限的 Token
- ✅ 只指定需要的 bucket
- ❌ 不要把 Token 提交到 Git 仓库
- ❌ 不要在公开场合分享 Token

---

## 8. 免费额度与避坑清单

### Cloudflare R2 免费额度

| 项目 | 免费额度 |
|------|----------|
| 存储 | 10 GB/月 |
| A 类操作（写/列表） | 100 万次/月 |
| B 类操作（读） | 1000 万次/月 |
| 出站流量 | **完全免费** |

### Cloudflare Pages 免费额度

| 项目 | 免费额度 |
|------|----------|
| 带宽 | 无限 |
| 构建次数 | 无限 |
| 请求数 | 无限 |

### 常见问题

| 问题 | 解决方案 |
|------|----------|
| 图片显示 404 | 检查 R2 文件是否存在、URL 是否正确 |
| 图片加载慢 | 检查 R2 公共访问是否开启、图片是否过大 |
| 新增图片不显示 | 检查 data.js 的 photos 数组是否已更新 |
| 分类筛选不到 | 检查 category 字段是否正确、categories() 方法是否包含该分类 |
| 本地预览正常但线上异常 | 强制刷新浏览器（Cmd+Shift+R）或清 CDN 缓存 |
| Cloudflare Pages 部署失败 | 检查 GitHub 连接状态、查看部署日志 |

### 迁移到 Cloudflare Pages 的原因

| 对比项 | Vercel | Cloudflare Pages |
|--------|--------|------------------|
| 国内访问 | ❌ 不稳定 | ✅ 稳定快速 |
| 免费带宽 | 100GB/月 | ✅ 无限 |
| R2 集成 | 需额外配置 | ✅ 原生支持 |
| 自动部署 | ✅ | ✅ |

---

## 设计与版权

- 视觉设计原创，参考川内伦子摄影官网的安静克制气质
- 字体：Cormorant Garamond（衬线）
- 主色调：暖灰米白 `#FAFAF7`、墨色 `#2B2B28`
- 页脚版权信息由 `js/data.js` 的 `window.SITE` 控制

---

## 快速参考

```bash
# 本地预览
python3 -m http.server 8000

# 处理新照片
python3 tools/prepare_images.py --r2-base https://pub-xxx.r2.dev

# 上传到 R2
python3 tools/upload_to_r2.py

# 提交部署
git add -A && git commit -m "update" && git push origin main
```

**记住：日常只需要维护 `js/data.js` 和 `photofile/` 文件夹！**
