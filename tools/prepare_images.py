#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
==========================================================================
 LucaLiu Photography — 照片批量处理脚本
 --------------------------------------------------------------------------
 把 photofile/ 里的原图（JPG / DNG / 其它 RAW）处理成网站资产：
   1) 缩略图（长边 1920px）→ images/thumbnails/   （入仓库，网站 cover 引用）
   2) 展示大图（长边 3000px）→ r2-upload/          （待上传到 Cloudflare R2）
 并自动更新 js/data.js 的 window.WORKS 作品列表。

 用法（在项目根目录 d:\\photoweb 下执行）：
   python tools/prepare_images.py
        ↑ 测试期：full 暂用本地缩略图，无需 R2 即可立即在网站看到真实照片

   python tools/prepare_images.py --r2-base https://media.你的域名.com
        ↑ R2 + 自定义域名就绪后重跑：full 改为 R2 地址

 依赖：pip install pillow rawpy
   - Pillow：处理 JPG/PNG
   - rawpy ：解码 DNG/CR2/NEF/ARW 等RAW格式（Windows 有预编译包）
==========================================================================
"""
import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "photofile"
THUMB_DIR = ROOT / "images" / "thumbnails"
WEB_DIR = ROOT / "r2-upload"
DATA_JS = ROOT / "js" / "data.js"
MANIFEST_JSON = ROOT / "manifest.json"

THUMB_EDGE = 1920
WEB_EDGE = 3000
THUMB_QUALITY = 86
WEB_QUALITY = 88

# 文件夹 → 作品分类映射（按需修改；分类必须为 Landscape / Travel / Street / Portrait）
FOLDER_CATEGORY = {
    "Film": "Street",       # 胶片作品，默认归 Street，按需改
    "Sydney": "Travel",
    "Takamatsu": "Travel",
}
DEFAULT_CATEGORY = "Travel"

IMG_EXTS = (".jpg", ".jpeg", ".png", ".dng", ".cr2", ".nef", ".arw", ".raf")


def slug(s):
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "img"


def list_images():
    """返回 [(folder, idx, filepath), ...]，按文件夹+文件名排序"""
    items = []
    if not SRC.exists():
        return items
    for folder in sorted([p for p in SRC.iterdir() if p.is_dir()]):
        files = sorted([f for f in folder.iterdir() if f.suffix.lower() in IMG_EXTS])
        for i, f in enumerate(files, 1):
            items.append((folder.name, i, f))
    # 兼容：photofile/ 根目录散图
    root_files = sorted([f for f in SRC.iterdir() if f.is_file() and f.suffix.lower() in IMG_EXTS])
    for i, f in enumerate(root_files, 1):
        items.append(("misc", i, f))
    return items


def load_image(path):
    """加载图片为 PIL.Image（RGB）；RAW 用 rawpy 解码"""
    from PIL import Image, ImageOps
    ext = path.suffix.lower()
    if ext in (".dng", ".cr2", ".nef", ".arw", ".raf"):
        import rawpy  # noqa
        with rawpy.imread(str(path)) as raw:
            rgb = raw.postprocess(output_bps=8, use_camera_wb=True)
        return Image.fromarray(rgb)
    img = Image.open(path)
    img = ImageOps.exif_transpose(img)  # 按 EXIF 自动旋转
    return img


def resample_filter():
    from PIL import Image
    try:
        return Image.Resampling.LANCZOS
    except AttributeError:
        return Image.LANCZOS


def resize_to_edge(img, edge):
    w, h = img.size
    scale = edge / float(max(w, h))
    if scale >= 1:
        return img
    nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
    return img.resize((nw, nh), resample_filter())


def save_jpeg(img, dest, quality):
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")
    img.save(dest, "JPEG", quality=quality, optimize=True)


def exif_date(path):
    try:
        from PIL import Image
        with Image.open(path) as im:
            exif = im._getexif() or {}
        d = exif.get(36867) or exif.get(36868)  # DateTimeOriginal / DateTimeDigitized
        if d:
            return datetime.strptime(d, "%Y:%m:%d %H:%M:%S").strftime("%Y-%m-%d")
    except Exception:
        pass
    return None


def patch_data_js(series_list):
    """仅替换 js/data.js 中的 window.SERIES = [ ... ]; 块，保留其余内容"""
    text = DATA_JS.read_text(encoding="utf-8")
    block = "window.SERIES = " + json.dumps(series_list, ensure_ascii=False, indent=2) + ";"
    new_text, n = re.subn(
        r"window\.SERIES\s*=\s*\[[\s\S]*?\n\];",
        lambda m: block,
        text,
        count=1,
    )
    if n == 0:
        print("⚠ 未能定位 window.SERIES 块，data.js 未修改（请检查文件格式）")
        return False
    DATA_JS.write_text(new_text, encoding="utf-8")
    return True


def update_manifest(series_list):
    """生成/更新 manifest.json（保留已有的 site 信息和手动编辑的元数据）"""
    # 读取现有 manifest（如果存在），保留手动编辑的元数据
    existing = {}
    if MANIFEST_JSON.exists():
        try:
            with open(MANIFEST_JSON, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
            # 用 id 作为 key，保留手动编辑的字段
            for s in existing_data.get('series', []):
                existing[s['id']] = s
            existing_site = existing_data.get('site', {})
        except:
            existing_site = {}
    else:
        existing_site = {}

    # 合并：新扫描的数据为基础，保留已有的手动编辑
    merged = []
    new_ids = set()
    for s in series_list:
        sid = s['id']
        new_ids.add(sid)
        if sid in existing:
            # 保留已有元数据，只更新 photos/cover/full（可能新增了照片）
            old = existing[sid]
            merged.append({
                "id": sid,
                "title": old.get("title", s["title"]),
                "year": old.get("year", s["year"]),
                "category": old.get("category", s["category"]),
                "date": old.get("date", s["date"]),
                "location": old.get("location", ""),
                "camera": old.get("camera", ""),
                "lens": old.get("lens", ""),
                "notes": old.get("notes", ""),
                "cover": s["cover"],
                "full": s["full"],
                "featured": old.get("featured", s["featured"]),
                "photos": s["photos"],  # photos 列表始终用最新的
            })
        else:
            # 新系列，使用扫描结果
            merged.append(s)

    # 保留 manifest 中有但 photofile 中已不存在的系列（用户可能只是临时删了图）
    for sid, old in existing.items():
        if sid not in new_ids:
            merged.append(old)

    manifest = {
        "site": existing_site or {
            "name": "LucaLiu Photography",
            "author": "Luca Liu",
            "startYear": 2024,
            "social": []
        },
        "series": merged
    }

    with open(MANIFEST_JSON, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    return True


def main():
    ap = argparse.ArgumentParser(description="批量处理 photofile/ 并更新 data.js")
    ap.add_argument("--r2-base", default="", help="R2 公开访问基址，如 https://media.你的域名.com")
    args = ap.parse_args()
    r2_base = (args.r2_base or "").rstrip("/")

    # 依赖检查
    try:
        from PIL import Image  # noqa: F401
    except ImportError:
        print("缺少依赖 Pillow。请先执行：pip install pillow rawpy")
        sys.exit(1)

    # 按文件夹分组：folder -> [filepath, ...]
    folders = {}
    if SRC.exists():
        for folder in sorted([p for p in SRC.iterdir() if p.is_dir()]):
            files = sorted([f for f in folder.iterdir() if f.suffix.lower() in IMG_EXTS])
            if files:
                folders[folder.name] = files
    root_files = sorted([f for f in SRC.iterdir() if f.is_file() and f.suffix.lower() in IMG_EXTS])
    if root_files:
        folders["misc"] = root_files

    if not folders:
        print("未在 photofile/ 找到图片。请把原图放入 photofile/<文件夹>/ 下后重跑。")
        sys.exit(0)

    has_raw = any(f.suffix.lower() in (".dng", ".cr2", ".nef", ".arw", ".raf") for fs in folders.values() for f in fs)
    if has_raw:
        try:
            import rawpy  # noqa: F401
        except ImportError:
            print("检测到 RAW 文件（DNG 等），但未安装 rawpy，这些文件将被跳过。")
            print("请执行：pip install rawpy  后重跑，以处理 RAW 原图。")

    THUMB_DIR.mkdir(parents=True, exist_ok=True)
    WEB_DIR.mkdir(parents=True, exist_ok=True)

    # 每个"文件夹 = 一个系列"，系列内照片按文件名排序
    series_list = []
    seen_cat_first = set()
    ok = fail = 0
    for folder_name, files in folders.items():
        sid = slug(folder_name)
        category = FOLDER_CATEGORY.get(folder_name, DEFAULT_CATEGORY)
        photos = []
        cover_set = False
        # 系列日期取首张可用日期
        series_date = None
        for i, fpath in enumerate(files, 1):
            pid = "{}-{:02d}".format(sid, i)
            try:
                img = load_image(fpath)
                thumb = resize_to_edge(img, THUMB_EDGE)
                save_jpeg(thumb, THUMB_DIR / (pid + ".jpg"), THUMB_QUALITY)
                web = resize_to_edge(img, WEB_EDGE)
                save_jpeg(web, WEB_DIR / (pid + ".jpg"), WEB_QUALITY)
                d = exif_date(fpath) or datetime.fromtimestamp(fpath.stat().st_mtime).strftime("%Y-%m-%d")
                if not series_date:
                    series_date = d
                if r2_base:
                    # 生产模式：cover 走 R2 缩略图，photos/full 走 R2 高清原图
                    #   cover 缩略图 → {r2_base}/thumbs/{pid}.jpg  （需把 images/thumbnails/ 上传到 R2 的 thumbs/）
                    #   photos/full  → {r2_base}/{pid}.jpg          （需把 r2-upload/ 上传到 R2 根目录）
                    thumb_url = "{}/thumbs/{}.jpg".format(r2_base, pid)
                    full_url = "{}/{}.jpg".format(r2_base, pid)
                else:
                    # 占位模式：仓库不存图，指向本地路径，文件不存在时前端 onerror 显示柔和占位块
                    thumb_url = "images/thumbnails/{}.jpg".format(pid)
                    full_url = "images/thumbnails/{}.jpg".format(pid)
                photos.append({ "src": full_url, "caption": "" })
                if not cover_set:
                    cover = thumb_url
                    full = full_url
                    cover_set = True
                ok += 1
                print("  [OK]   {}/{}  ->  {}  ({}x{})".format(folder_name, fpath.name, pid, img.size[0], img.size[1]))
            except Exception as e:
                fail += 1
                print("  [FAIL] {}/{}  :  {}".format(folder_name, fpath.name, e))

        if cover_set:
            featured = category not in seen_cat_first
            seen_cat_first.add(category)
            # 年份从系列日期提取
            year = int((series_date or "2024")[:4]) if series_date else 2024
            series_list.append({
                "id": sid,
                "title": folder_name,
                "year": year,
                "category": category,
                "date": series_date or datetime.now().strftime("%Y-%m-%d"),
                "location": "",
                "camera": "",
                "lens": "",
                "notes": "",
                "cover": cover,
                "full": full,
                "featured": featured,
                "photos": photos,
            })

    if series_list:
        patch_data_js(series_list)
        update_manifest(series_list)

    print("\n========== 处理完成 ==========")
    print("成功 {} 张，失败 {} 张".format(ok, fail))
    print("系列数：{} 个".format(len(series_list)))
    print("缩略图(1920px) → images/thumbnails/   （本地，需上传到 R2 的 thumbs/ 目录）")
    print("展示大图(3000px) → r2-upload/         （本地，需上传到 R2 根目录）")
    print("js/data.js 的 window.SERIES 已更新（兜底数据，共 {} 个系列）".format(len(series_list)))
    print("manifest.json 已更新（用于 sync_r2.py 同步到 R2）")
    if not r2_base:
        print("\n[占位模式] 仓库不存图，网站打开时图片位置显示柔和占位块（onerror 自动兜底）。")
        print("Cloudflare R2 配好后，重新执行：")
        print("  python tools/prepare_images.py --r2-base https://media.你的域名.com")
        print("然后把 images/thumbnails/ 上传到 R2 的 thumbs/、r2-upload/ 上传到 R2 根目录。")
    else:
        print("\n[生产模式] cover / full / photos 均指向 R2：{}".format(r2_base))
        print("  cover/photos → {}/thumbs/<id>.jpg".format(r2_base))
        print("  full         → {}/<id>.jpg".format(r2_base))
    print("请按需编辑 manifest.json 里的 title / category / year / location / camera / lens / notes。")
    print("分类映射可在 tools/prepare_images.py 顶部 FOLDER_CATEGORY 修改。")
    print("\n下一步：运行 sync_r2.py 同步到 R2：")
    print("  python3 tools/sync_r2.py --dry   # 预览")
    print("  python3 tools/sync_r2.py         # 执行")


if __name__ == "__main__":
    main()
