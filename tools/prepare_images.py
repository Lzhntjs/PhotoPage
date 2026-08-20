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


def patch_data_js(works):
    """仅替换 js/data.js 中的 window.WORKS = [ ... ]; 块，保留其余内容"""
    text = DATA_JS.read_text(encoding="utf-8")
    block = "window.WORKS = " + json.dumps(works, ensure_ascii=False, indent=2) + ";"
    new_text, n = re.subn(
        r"window\.WORKS\s*=\s*\[[\s\S]*?\n\];",
        lambda m: block,
        text,
        count=1,
    )
    if n == 0:
        print("⚠ 未能定位 window.WORKS 块，data.js 未修改（请检查文件格式）")
        return False
    DATA_JS.write_text(new_text, encoding="utf-8")
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

    items = list_images()
    if not items:
        print("未在 photofile/ 找到图片。请把原图放入 photofile/<文件夹>/ 下后重跑。")
        sys.exit(0)

    has_raw = any(f.suffix.lower() in (".dng", ".cr2", ".nef", ".arw", ".raf") for _, _, f in items)
    if has_raw:
        try:
            import rawpy  # noqa: F401
        except ImportError:
            print("检测到 RAW 文件（DNG 等），但未安装 rawpy，这些文件将被跳过。")
            print("请执行：pip install rawpy  后重跑，以处理 RAW 原图。")

    THUMB_DIR.mkdir(parents=True, exist_ok=True)
    WEB_DIR.mkdir(parents=True, exist_ok=True)

    works = []
    seen_cat_first = set()
    ok = fail = 0
    for folder, idx, fpath in items:
        wid = "{}-{:02d}".format(slug(folder), idx)
        title = "{} {:02d}".format(folder, idx)
        category = FOLDER_CATEGORY.get(folder, DEFAULT_CATEGORY)
        try:
            img = load_image(fpath)
            thumb = resize_to_edge(img, THUMB_EDGE)
            save_jpeg(thumb, THUMB_DIR / (wid + ".jpg"), THUMB_QUALITY)
            web = resize_to_edge(img, WEB_EDGE)
            save_jpeg(web, WEB_DIR / (wid + ".jpg"), WEB_QUALITY)
            date = exif_date(fpath) or datetime.fromtimestamp(fpath.stat().st_mtime).strftime("%Y-%m-%d")
            featured = category not in seen_cat_first
            seen_cat_first.add(category)
            if r2_base:
                # 生产模式：缩略图与展示大图都走 R2
                #   cover → {r2_base}/thumbs/{wid}.jpg   （1920px，需把 images/thumbnails/ 内容上传到 R2 的 thumbs/ 目录）
                #   full  → {r2_base}/{wid}.jpg          （3000px，需把 r2-upload/ 内容上传到 R2 根目录）
                cover = "{}/thumbs/{}.jpg".format(r2_base, wid)
                full = "{}/{}.jpg".format(r2_base, wid)
            else:
                # 占位模式：仓库不存图，cover/full 指向本地路径，文件不存在时前端 onerror 自动显示柔和占位块
                cover = "images/thumbnails/{}.jpg".format(wid)
                full = "images/thumbnails/{}.jpg".format(wid)
            works.append({
                "id": wid, "title": title, "category": category, "date": date,
                "location": "", "camera": "", "lens": "", "notes": "",
                "cover": cover, "full": full, "featured": featured,
            })
            ok += 1
            print("  [OK]   {}/{}  ->  {}  ({}x{})".format(folder, fpath.name, wid, img.size[0], img.size[1]))
        except Exception as e:
            fail += 1
            print("  [FAIL] {}/{}  :  {}".format(folder, fpath.name, e))

    if works:
        patch_data_js(works)

    print("\n========== 处理完成 ==========")
    print("成功 {} 张，失败 {} 张".format(ok, fail))
    print("缩略图(1920px) → images/thumbnails/   （本地，需上传到 R2 的 thumbs/ 目录）")
    print("展示大图(3000px) → r2-upload/         （本地，需上传到 R2 根目录）")
    print("js/data.js 的 window.WORKS 已更新（共 {} 条）".format(len(works)))
    if not r2_base:
        print("\n[占位模式] 仓库不存图，网站打开时图片位置显示柔和占位块（onerror 自动兜底）。")
        print("Cloudflare R2 配好后，重新执行：")
        print("  python tools/prepare_images.py --r2-base https://media.你的域名.com")
        print("然后把 images/thumbnails/ 上传到 R2 的 thumbs/、r2-upload/ 上传到 R2 根目录。")
    else:
        print("\n[生产模式] cover 与 full 均指向 R2：{}".format(r2_base))
        print("  cover → {}/thumbs/<id>.jpg".format(r2_base))
        print("  full  → {}/<id>.jpg".format(r2_base))
    print("请按需编辑 js/data.js 里的 title / category / location / camera / lens / notes。")
    print("分类映射可在 tools/prepare_images.py 顶部 FOLDER_CATEGORY 修改。")


if __name__ == "__main__":
    main()
