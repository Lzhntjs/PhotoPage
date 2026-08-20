# LucaLiu Photography

一套**轻量化纯静态摄影画册网站**。安静、克制、大量留白，参考川内伦子的艺术气质，原创实现。

- 架构：HTML5 + CSS3 + 原生 JS + Tailwind CSS（CDN，零构建）
- 无后端、无数据库、无服务器、无实时服务依赖 → 极致稳定、零运维
- 混合图片存储：仓库存缩略图，Cloudflare R2 存高清大图
- 托管：Vercel 自动部署；DNS/CDN/HTTPS：Cloudflare

---

## 目录

1. [项目结构](#1-项目结构)
2. [本地预览](#2-本地预览)
3. [部署教程（从零开始）](#3-部署教程从零开始)
   - 3.1 注册账号
   - 3.2 上传代码到 GitHub
   - 3.3 Vercel 关联部署（方案一：免费子域名）
   - 3.4 Cloudflare R2 存储桶创建 + 公共访问
   - 3.5 R2 图片防盗链配置
   - 3.6 替换占位图为你的真实作品
   - 3.7 绑定自定义域名（方案二：正式作品集）
   - 3.8 Cloudflare DNS 解析与 HTTPS
4. [两套域名方案对比](#4-两套域名方案对比)
5. [运维手册](#5-运维手册)
   - 5.1 新增作品
   - 5.2 删除作品
   - 5.3 修改作品信息
   - 5.4 调整网站风格
6. [后续迭代指令模板](#6-后续迭代指令模板)
7. [免费边界与避坑清单](#7-免费边界与避坑清单)
8. [Cloudflare R2 计费说明](#8-cloudflare-r2-计费说明)
9. [免费 / 付费环节一览](#9-免费--付费环节一览)

---

## 1. 项目结构

```
photoweb/
├── index.html          首页（精选作品，纵向堆叠大图）
├── gallery.html        相册页（分类筛选 + 瀑布流）
├── work.html           作品详情页（大图 + 元数据 + 灯箱）
├── about.html          关于页
├── vercel.json         Vercel 配置（cleanUrls / 缓存 / 安全头）
├── css/
│   └── style.css       设计令牌、字体、动画、灯箱样式
├── js/
│   ├── data.js         ★ 作品元数据“数据库”（你只需改这一个文件）
│   ├── app.js          全站共享逻辑（菜单/懒加载/版权年份）
│   ├── lightbox.js     全屏灯箱（缩放/左右切换/移动端滑动）
│   ├── home.js         首页精选渲染
│   ├── gallery.js      相册页渲染
│   └── work.js         详情页渲染
└── images/
    └── thumbnails/     仓库内存放的缩略图（小图，长边≤1920px）
```

> 你日常只接触两个东西：`js/data.js`（作品数据）和 `images/thumbnails/`（缩略图）。其余文件无需改动。

---

## 2. 本地预览

无需安装任何东西，用 Python 自带服务器即可：

```powershell
# 在项目根目录 d:\photoweb 下执行
python -m http.server 8000
```

浏览器打开 `http://localhost:8000` 即可预览。

> 没有 Python？也可用 VS Code 的 “Live Server” 插件，右键 `index.html` → Open with Live Server。

---

## 3. 部署教程（从零开始）

> 全程图形界面操作，零命令行（除本地可选的 git 外）。下面以“GitHub + Vercel + Cloudflare”组合为例。

### 3.1 注册账号（全部免费）

- GitHub：https://github.com（代码托管）
- Vercel：https://vercel.com（用 GitHub 账号一键登录即可）
- Cloudflare：https://dash.cloudflare.com（DNS/CDN/R2/HTTPS）

### 3.2 上传代码到 GitHub

1. 登录 GitHub → 右上角 `+` → **New repository**
   - Repository name：`photoweb`
   - 选择 **Public**（Private 也能部署，但 Public 最省心）
   - **不要**勾选 “Add a README”（本仓库已有）
   - 点 **Create repository**
2. 在 GitHub 仓库页面点 **uploading an existing file**（“上传已有文件”链接）
3. 把 `d:\photoweb` 里**所有文件和文件夹**拖进去（含 `.gitignore`、`vercel.json`、`css/`、`js/`、`images/`、各 `.html`）
4. 提交信息写 `init` → **Commit changes**

> 想用 git 命令行也可：
> ```powershell
> cd d:\photoweb
> git init
> git add .
> git commit -m "init"
> git branch -M main
> git remote add origin https://github.com/你的用户名/photoweb.git
> git push -u origin main
> ```

### 3.3 Vercel 关联部署（方案一：免费子域名）

1. 登录 https://vercel.com → 右上角 **Add New…** → **Project**
2. 在 “Import Git Repository” 列表里找到 `photoweb` → 点 **Import**
3. 配置页面**全部保持默认**（Framework Preset 会自动识别为 Other，无需改）→ 直接点 **Deploy**
4. 等待约 30 秒，出现 “Congratulations” 即部署成功
5. 点 **Visit** 即可看到网站，地址形如 `https://photoweb-xxxxx.vercel.app`

**以后每次你更新 GitHub 仓库，Vercel 会自动重新部署，无需任何操作。**

### 3.4 Cloudflare R2 存储桶创建 + 公共访问

> R2 用来存高清大图（长边 3000px），网页只引用其 URL，不打入构建包，规避 Vercel 250MB 限制。

1. 登录 Cloudflare 控制台 → 左侧 **R2 Object Storage**（首次需点 Activate，**无需绑卡也能用免费额度**，但开启自定义域名公开访问需绑定一张卡做验证——不会扣费）
2. 点 **Create bucket**
   - Bucket name：`lucaliu-photos`
   - Location：留空（Auto）或选离你近的区域
   - 点 **Create**
3. 启用**公共访问**（让网页能直接读图）：
   - 进入 bucket → **Settings** → **Public access**
   - 点 **Connect domain**，输入一个子域名，例如 `media.你的域名.com`
   - 前提：该域名需已托管在 Cloudflare（见 3.7/3.8）。Cloudflare 会自动添加一条 CNAME，几秒后生效
   - 配好后会得到公共访问基址，如 `https://media.你的域名.com`
4. 上传图片：
   - 进入 bucket → **Objects** → **Upload**，把高清大图（如 `landscape-01.jpg`）拖入
   - 上传后该图公共 URL 即为 `https://media.你的域名.com/landscape-01.jpg`

> 没有“自定义域名”时，R2 还提供一个 `*.r2.dev` 的临时公开地址（bucket Settings → R2.dev subdomain → Allow），仅供测试，生产请用自定义域名。

### 3.5 R2 图片防盗链配置

目标：仅允许你的网站加载 R2 图片，禁止其他站点盗链。用 Cloudflare Worker 做 Referer 校验最稳：

1. Cloudflare 控制台 → 左侧 **Workers & Pages** → **Create application** → **Create Worker**
2. 名字随意（如 `r2-hotlink`）→ **Deploy** → **Edit code**
3. 把下面代码粘贴进编辑器（替换默认内容），把 `你的域名.com` 改成你的真实域名：

```js
export default {
  async fetch(request, env) {
    const referer = request.headers.get('Referer') || '';
    const allow = ['你的域名.com', 'www.你的域名.com', 'localhost', 'vercel.app'];
    const ok = allow.some(d => new URL(referer || 'http://x').hostname.endsWith(d));
    if (!ok && referer !== '') {
      return new Response('Forbidden', { status: 403 });
    }
    const url = new URL(request.url);
    const object = await env.PHOTOS.get(url.pathname.slice(1));
    if (!object) return new Response('Not Found', { status: 404 });
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Access-Control-Allow-Origin', 'https://你的域名.com');
    return new Response(object.body, { headers });
  }
};
```

4. 点 **Save and deploy**
5. 绑定 R2 到该 Worker：Worker 详情页 → **Settings** → **Bindings** → **Add binding**
   - 选 **R2 bucket**，Variable name 填 `PHOTOS`，选你的 bucket `lucaliu-photos` → **Deploy**
6. 给 Worker 绑定路由（让 `media.你的域名.com` 走这个 Worker）：
   - Worker → **Settings** → **Triggers** → **Custom Domains** → **Add Custom Domain** → 填 `media.你的域名.com`
   - 这样访问 `media.你的域名.com/xx.jpg` 就会经过防盗链校验

> 懒人方案：也可只开 Cloudflare 的 **Scrape Shield → Hotlink Protection**（一键开关，整域名生效），但它是粗粒度的；上面的 Worker 更精准且可加 CORS。

### 3.6 替换占位图为你的真实作品

打开 `js/data.js`，把示例作品里的 `cover` 和 `full` 改成你的真实地址：

```js
{
  id: "misty-dawn",
  title: "Morning Mist",
  category: "Landscape",
  date: "2024-03-15",
  location: "Yunnan, China",      // 你填写
  camera: "Leica Q3",             // 你填写
  lens: "28mm f/1.7",            // 你填写
  notes: "First light over the valley...",  // 你填写
  cover: "images/thumbnails/misty-dawn.jpg",                 // 仓库内小图
  full:  "https://media.你的域名.com/misty-dawn.jpg",         // R2 大图
  featured: true
}
```

- `cover`：把缩略图（长边 ≤1920px）放进 `images/thumbnails/`，路径写 `images/thumbnails/文件名.jpg`
- `full`：填 R2 大图 URL（长边 3000px）
- 提交到 GitHub → Vercel 自动重新部署 → 网站更新

### 3.7 绑定自定义域名（方案二：正式作品集）

> Vercel 海外托管绑定自定义域名**不需要 ICP 备案**。

1. 先有一个域名（见下文“域名选购建议”）
2. 域名托管到 Cloudflare（见 3.8 第 1 步）
3. Vercel 项目页 → **Settings** → **Domains** → 输入你的域名（如 `yourname.art`）→ **Add**
4. Vercel 会显示需要添加的 DNS 记录（一条 CNAME 指向 `cname.vercel-dns.com`）
5. 去 Cloudflare DNS 添加该 CNAME（见 3.8 第 4 步）→ 回 Vercel 点 **Refresh**，几秒后变绿，HTTPS 自动签发完成

### 3.8 Cloudflare DNS 解析与 HTTPS

1. Cloudflare 控制台 → **Add a site** → 输入你的域名 → 选 **Free 计划**
2. Cloudflare 会给你两个 **nameserver**（如 `xxx.ns.cloudflare.com`）
3. 去你买域名的注册商后台 → 修改域名的 **Nameserver** 为 Cloudflare 给的这两个 → 等待生效（几分钟到数小时）
4. DNS 解析：Cloudflare → 你的站点 → **DNS** → **Records** → **Add record**
   - 主域名：类型 `CNAME`，Name `@` 或 `yourname.art`，Target `cname.vercel-dns.com`，Proxy 开启（橙色云）
   - 媒体子域：类型 `CNAME`，Name `media`，Target R2/Worker 给的地址，Proxy 开启
5. HTTPS：Cloudflare → **SSL/TLS** → 模式选 **Full** 或 **Full (strict)**；证书 Cloudflare 自动签发，无需操作
6. 强制 HTTPS：**SSL/TLS** → **Edge Certificates** → 开启 **Always Use HTTPS**

**域名选购建议**：

| 后缀 | 年费约 | 说明 |
|------|--------|------|
| `.com` | ¥80–120 | 最通用、最稳，适合正式作品集 |
| `.art` | ¥80–150 | 艺术气息强，摄影作品集首选 |
| `.xyz` | ¥30–60 | 便宜，短而个性 |
| `.photography` | ¥150–250 | 语义清晰但偏长 |

> 推荐在 Cloudflare Registrar（Cloudflare 自营域名注册）购买，**成本价续费、不加价**，且与 DNS/CDN 一站式管理。

---

## 4. 两套域名方案对比

| 维度 | 方案一（测试） | 方案二（正式作品集） |
|------|----------------|----------------------|
| 域名 | `photoweb-xxxxx.vercel.app` | `yourname.com` / `.art` / `.xyz` |
| 成本 | 完全免费 | 仅域名年费（约 ¥30–250/年） |
| 是否需备案 | 否 | 否（Vercel 海外托管，自定义域名**无需 ICP 备案**） |
| 平台后缀 | 有 vercel.app 后缀 | 无后缀，干净独立官网 |
| HTTPS | 自动 | 自动（Cloudflare 签发） |
| 适用阶段 | 前期预览调试 | 正式对外作品集 |

---

## 5. 运维手册

> 核心原则：**新增/删除/修改作品只改 `js/data.js`，不动任何其他代码。**

### 5.0 批量处理照片（推荐，一次处理一整批原图）

把原图放进 `photofile/<文件夹>/`（如 `photofile/Sydney/`、`photofile/Takamatsu/`），文件夹名可在脚本顶部 `FOLDER_CATEGORY` 映射到分类。然后：

```powershell
# 一次性生成缩略图(1920px入仓库) + 展示大图(3000px待传R2) + 更新 data.js
python tools/prepare_images.py
```

- 支持 JPG / PNG / DNG / CR2 / NEF / ARW（RAW 需 `pip install rawpy`）
- 测试期 `full` 自动用本地缩略图，**无需 R2 即可在网站看到真实照片**
- R2 + 自定义域名就绪后，重跑一次切到生产模式：
  `python tools/prepare_images.py --r2-base https://media.你的域名.com`
- 之后按需手动编辑 `js/data.js` 里的 `title / category / date / location / camera / lens / notes`

> 单张新增也可用下面的手动流程。

### 5.1 新增作品（完整工作流）

1. 准备两张图：
   - 缩略图：长边 ≤1920px，命名如 `new-work.jpg`
   - 高清大图：长边 3000px，同款命名
2. 缩略图放进 `images/thumbnails/new-work.jpg`，提交到 GitHub
3. 高清大图上传到 Cloudflare R2 bucket（3.4 第 4 步）
4. 打开 `js/data.js`，在 `window.WORKS` 数组里**复制一条**，改字段：

```js
{
  id: "new-work",                 // 唯一，英文+数字
  title: "New Work",
  category: "Travel",            // Landscape / Travel / Street / Portrait
  date: "2025-01-01",
  location: "",
  camera: "",
  lens: "",
  notes: "",
  cover: "images/thumbnails/new-work.jpg",
  full: "https://media.你的域名.com/new-work.jpg",
  featured: false                // true 则上首页精选
}
```

5. 提交到 GitHub → Vercel 自动重新部署 → 完成

### 5.2 删除作品

在 `js/data.js` 里删掉对应那条 `{ ... }`（注意保留前后的逗号正确），提交即可。R2 上的大图可留着也可手动删（不删也不计多少费用）。

### 5.3 修改作品信息

直接改 `js/data.js` 里对应那条的字段（如改 `title`、补 `location`、换 `cover`），提交即可。

### 5.4 调整网站风格

常见调整都在 `css/style.css` 顶部的设计令牌里改一个值即可全局生效：

```css
:root {
  --paper: #FAFAF7;   /* 改背景色 */
  --ink:   #2B2B28;   /* 改文字色 */
  --muted: #9A9A92;   /* 改次级文字色 */
  --maxw:   1280px;   /* 改内容最大宽度 */
}
```

- 想换字体：改 `css/style.css` 顶部 `@import` 的 Google Fonts 链接 + `font-family`
- 想改间距/留白：改 `section-breathe` 的 `padding-block` 值
- 想加分类：在 `js/data.js` 的 `categories()` 里加，并在作品 `category` 字段使用

---

## 6. 后续迭代指令模板

后续修改网站，直接把下面这类自然语言指令发给 AI（如 Trae），它就能改：

- “把首页精选作品改成显示 6 张”
- “相册页改成三列网格”
- “导航加一个 Prints 入口指向 about.html#prints”
- “作品详情页加一个‘相机参数’区块，显示 ISO/光圈/快门”
- “把整站字体换成 Cormorant 衬线字体”
- “首页加一段大标题引言，文字居中”
- “把背景色从米白改成纯白 #FFFFFF”

> 改完后 `python -m http.server 8000` 本地确认，再提交 GitHub 自动上线。

---

## 7. 免费边界与避坑清单

### Vercel 免费版（Hobby 计划）限制

- ✅ 带宽：**100 GB/月**免费（图片走 R2 不计入，所以基本用不完）
- ⚠️ **构建产物 250 MB 硬限制** → 这就是为什么大图必须放 R2，仓库只放缩略图
- ✅ 每次构建时长：免费版 45 分钟（本站秒级构建，远不到）
- ⚠️ 商业用途：Hobby 计划条款上“非商业”，纯个人作品集没问题；若以后商业售卖再升 Pro（$20/月）

### Cloudflare R2 免费额度

- ✅ 存储：**10 GB/月免费**
- ✅ A 类操作（写/列表）：**100 万次/月免费**
- ✅ B 类操作（读）：**1000 万次/月免费**
- ✅ **出站流量（egress）完全免费**（相对 AWS S3 的最大优势）
- 详见第 8 节计费

### Cloudflare 免费版（DNS/CDN/Worker）

- ✅ DNS + CDN + 无限 HTTPS 证书：免费
- ⚠️ Worker 免费版：**10 万次请求/天**（防盗链校验走 Worker；个人作品集访问量远低于此）
- ⚠️ Worker 单次执行 CPU 时间 10ms 限制（防盗链够用）

### 常见坑

| 坑 | 规避 |
|----|------|
| 仓库塞满大图导致 Vercel 构建包超 250MB 报错 | 大图一律放 R2，仓库只放 ≤1920px 缩略图 |
| RAW 直出十几 MB 原图上传 R2 导致加载卡顿 | 导出时长边压到 3000px、JPEG 质量 85 左右 |
| 图片在网页显示裂图 / 403 | 检查 R2 公共访问是否开启；防盗链 Worker 的 Referer 白名单是否含你的域名和 `vercel.app`（测试期） |
| 自定义域名打不开 | DNS 的 CNAME 是否添加、Cloudflare 代理云朵是否开启、Vercel Domains 是否点 Refresh |
| 国内访问慢 | Vercel 节点偶有波动属正常；图片走 Cloudflare CDN 通常很快；正文站本身极轻量影响小 |
| 域名忘记续费被抢注 | 注册商后台开启“自动续费”，提前 30 天续费 |

---

## 8. Cloudflare R2 计费说明

| 项目 | 免费额度 | 超出后价格 |
|------|----------|------------|
| 存储 | 10 GB / 月 | $0.015 / GB / 月 |
| A 类操作（写、列表） | 1,000,000 次 / 月 | $4.50 / 百万次 |
| B 类操作（读） | 10,000,000 次 / 月 | $0.36 / 百万次 |
| 出站流量（egress） | **完全免费** | $0 |

> 一个个人摄影作品集，假设 200 张高清大图、每张 3MB，总存储约 0.6GB，远在 10GB 内；读取量更是远低于千万级。**实际几乎不会产生费用。**
> 出站流量完全免费是 R2 的核心优势——即便你的作品被大量浏览也不会产生带宽费。

---

## 9. 免费 / 付费环节一览

| 环节 | 是否免费 | 金额 |
|------|----------|------|
| 代码托管 GitHub | 免费 | ¥0 |
| 网站部署 Vercel | 免费（Hobby） | ¥0 |
| Vercel 子域名 `.vercel.app` | 免费 | ¥0 |
| 自定义域名 | **付费（唯一硬支出）** | 约 ¥30–250 / 年（依后缀） |
| 域名续费 | 付费 | 同上，建议开自动续费 |
| Cloudflare DNS/CDN/HTTPS | 免费 | ¥0 |
| Cloudflare R2 存储 | 免费（10GB 内） | ¥0 |
| Cloudflare Worker 防盗链 | 免费（10万次/天内） | ¥0 |
| ICP 备案 | 不需要 | — |

**结论：除域名年费外，整站完全免费运行；唯一需要付费的就是域名本身。**

---

### 设计与版权

- 视觉设计原创，参考川内伦子摄影官网的安静克制气质，未复制其代码或页面结构
- 所有 UI 文字均为英文；作品元数据（地点、设备、文案）留给你自行填写
- 页脚版权年份与署名由 `js/data.js` 的 `window.SITE` 自动生成，改 `startYear` / `author` 即可

遇到问题，把现象描述发给 AI，它按本手册结构定位即可。
