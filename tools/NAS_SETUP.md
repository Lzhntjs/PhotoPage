# 绿联 NAS 部署指南

## 架构

```
NAS（你的电脑）                    Cloudflare R2              网站
┌─────────────────┐              ┌──────────────┐          ┌──────┐
│ photos/         │   nas_sync   │              │  fetch    │      │
│   ├── noncata/  │ ──────────→ │  thumbs/     │ ←───────  │ Pages│
│   ├── sydney/   │   (上传)     │  (大图)      │           │      │
│   └── ...       │              │  manifest.json│          └──────┘
│ manifest.json   │ ──────────→ │              │
└─────────────────┘              └──────────────┘
```

## 一次性配置

### 1. 在 NAS 上创建目录

SSH 登录 NAS 或通过文件管理器创建：

```
/share/photopage/           ← 主目录
├── nas_sync.py             ← 同步脚本
├── manifest.json           ← 元数据文件
├── photos/                 ← 放原图
│   ├── noncata/
│   ├── randomlife/
│   └── sydney/
└── .sync_cache             ← 自动生成，记录已上传文件
```

### 2. 安装 Python 依赖

SSH 登录 NAS：

```bash
# 绿联 NAS 通常自带 Python3，确认版本
python3 --version

# 安装依赖
pip3 install pillow boto3
```

> 如果 pip3 不可用，尝试 `python3 -m pip install pillow boto3`

### 3. 复制脚本和 manifest.json 到 NAS

将以下文件复制到 NAS 的 `/share/photopage/` 目录：
- `tools/nas_sync.py`
- `manifest.json`

### 4. 配置 R2 环境变量

在 NAS 上创建环境变量文件 `/share/photopage/.env`：

```bash
#!/bin/bash
export R2_ACCOUNT_ID="你的account_id"
export R2_ACCESS_KEY="你的access_key"
export R2_SECRET_KEY="你的secret_key"
export R2_BUCKET="lucaliu-photos"
```

> ⚠️ 不要把 .env 文件提交到 Git

### 5. 配置 CORS（仅首次）

确保 R2 已配置 CORS（参考 tools/configure_r2_cors.py 或在 Cloudflare Dashboard 设置）：
- Allowed Origins: `*`
- Allowed Methods: `GET`
- Allowed Headers: `*`

---

## 日常使用

### 新增照片到已有系列

1. **放照片**：把新照片放入 NAS 的 `photos/系列名/` 文件夹
2. **运行同步**：
   ```bash
   cd /share/photopage
   source .env
   python3 nas_sync.py
   ```
3. **完成**：刷新网站即可看到新照片

### 创建新系列

1. **创建文件夹**：在 `photos/` 下新建文件夹，如 `photos/tokyo/`
2. **放照片**：把照片放进去
3. **更新 manifest.json**：编辑 `/share/photopage/manifest.json`，添加新系列：
   ```json
   {
     "id": "tokyo",
     "title": "Tokyo",
     "year": 2025,
     "category": "Travel",
     "date": "2025-06-01",
     "location": "Tokyo, Japan",
     "cover": "https://pub-xxx.r2.dev/thumbs/tokyo-01.jpg",
     "full": "https://pub-xxx.r2.dev/tokyo-01.jpg",
     "featured": true,
     "photos": [
       { "src": "https://pub-xxx.r2.dev/tokyo-01.jpg", "caption": "" }
     ]
   }
   ```
4. **运行同步**：
   ```bash
   source .env
   python3 nas_sync.py
   ```

### 删除照片

1. 从 NAS 的 `photos/` 文件夹删除照片
2. 从 `manifest.json` 中删除对应的 photos 条目
3. 运行同步
4. （可选）在 Cloudflare Dashboard 手动删除 R2 上的旧文件

---

## 自动定时同步（可选）

如果希望 NAS 自动同步，可以设置定时任务：

### 方法：cron 定时任务

SSH 登录 NAS：

```bash
# 编辑 crontab
crontab -e

# 添加以下行（每天晚上 11 点自动同步）
0 23 * * * cd /share/photopage && source .env && python3 nas_sync.py >> /share/photopage/sync.log 2>&1
```

---

## 图片命名规则

NAS 上的照片文件名**不重要**（脚本会自动按 `系列ID-序号` 格式上传到 R2）：

```
photos/noncata/
├── IMG_0001.jpg    →  上传为 thumbs/noncata-01.jpg + noncata-01.jpg
├── IMG_0002.jpg    →  上传为 thumbs/noncata-02.jpg + noncata-02.jpg
└── ...
```

按文件名排序决定序号，所以建议用有顺序的文件名。

---

## manifest.json 的 cover 和 full 字段

这些字段需要手动填写 R2 URL，格式：
```
cover: https://pub-xxx.r2.dev/thumbs/{系列ID}-01.jpg
full:  https://pub-xxx.r2.dev/{系列ID}-01.jpg
```

photos 数组中的 src 同理：
```
src:   https://pub-xxx.r2.dev/{系列ID}-{序号}.jpg
```

> R2_BASE 地址：`https://pub-90fa7196a28e419894e73529296c0b5c.r2.dev`

---

## 快速参考

```bash
# 登录 NAS
ssh user@nas-ip

# 进入项目目录
cd /share/photopage

# 加载环境变量
source .env

# 运行同步
python3 nas_sync.py

# 查看同步日志（如果配了 cron）
tail -f sync.log
```
