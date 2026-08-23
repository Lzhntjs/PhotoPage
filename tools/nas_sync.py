#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
==========================================================================
 NAS → R2 同步脚本（绿联 NAS 版）
 --------------------------------------------------------------------------
 在 NAS 上运行此脚本，自动完成：
   1. 扫描 photos/ 目录下的系列文件夹
   2. 为每张照片生成 1920px 缩略图和 3000px 大图
   3. 上传到 Cloudflare R2
   4. 上传 manifest.json 到 R2

 用法：
   python3 nas_sync.py

 依赖：pip install pillow boto3

 环境变量（必须）：
   R2_ACCOUNT_ID   - Cloudflare Account ID
   R2_ACCESS_KEY   - R2 Access Key ID
   R2_SECRET_KEY   - R2 Secret Access Key
   R2_BUCKET       - R2 存储桶名（默认 lucaliu-photos）

 目录结构（NAS 上）：
   nas_sync.py
   manifest.json          ← 你维护的元数据文件
   photos/                ← 放原图的目录
     ├── noncata/         ← 系列文件夹（名字 = series id）
     │   ├── 01.jpg
     │   ├── 02.jpg
     │   └── ...
     ├── randomlife/
     │   └── ...
     └── sydney/
         └── ...

 manifest.json 格式见项目根目录的 manifest.json 文件
==========================================================================
"""
import os
import sys
import json
import hashlib
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("缺少依赖 pillow，请执行：pip install pillow")
    sys.exit(1)

try:
    import boto3
    from botocore.config import Config
except ImportError:
    print("缺少依赖 boto3，请执行：pip install boto3")
    sys.exit(1)

# ====== 配置 ======
ACCOUNT_ID = os.environ.get("R2_ACCOUNT_ID", "")
ACCESS_KEY  = os.environ.get("R2_ACCESS_KEY", "")
SECRET_KEY  = os.environ.get("R2_SECRET_KEY", "")
BUCKET      = os.environ.get("R2_BUCKET", "lucaliu-photos")
R2_BASE     = os.environ.get("R2_BASE", "https://pub-90fa7196a28e419894e73529296c0b5c.r2.dev")

# 图片处理参数
THUMB_MAX_SIZE = 1920   # 缩略图长边
FULL_MAX_SIZE  = 3000   # 大图长边
THUMB_QUALITY  = 86
FULL_QUALITY   = 88

# 目录
SCRIPT_DIR = Path(__file__).resolve().parent
PHOTOS_DIR = SCRIPT_DIR / "photos"
MANIFEST   = SCRIPT_DIR / "manifest.json"
CACHE_FILE = SCRIPT_DIR / ".sync_cache"  # 记录已上传文件的 hash

# R2 endpoint
R2_ENDPOINT = "https://{}.r2.cloudflarestorage.com".format(ACCOUNT_ID)

def main():
    check_config()
    s3 = create_s3_client()
    cache = load_cache()

    # 1) 处理并上传图片
    print("=" * 60)
    print("NAS → R2 同步开始")
    print("=" * 60)

    uploaded = skipped = failed = 0

    if PHOTOS_DIR.exists():
        for series_dir in sorted(PHOTOS_DIR.iterdir()):
            if not series_dir.is_dir():
                continue

            series_id = series_dir.name
            photos = sorted(
                f for f in series_dir.iterdir()
                if f.suffix.lower() in ('.jpg', '.jpeg', '.png', '.heic', '.webp')
            )

            if not photos:
                continue

            print(f"\n[{series_id}] {len(photos)} 张照片")

            for i, photo in enumerate(photos, 1):
                seq = f"{i:02d}"
                thumb_name = f"{series_id}-{seq}.jpg"
                full_name  = f"{series_id}-{seq}.jpg"

                # 检查是否需要上传（通过文件 hash）
                file_hash = file_md5(photo)
                cache_key = str(photo)

                if cache.get(cache_key) == file_hash:
                    print(f"  [跳过] {photo.name}（未修改）")
                    skipped += 1
                    continue

                # 生成缩略图
                thumb_path = SCRIPT_DIR / ".tmp_thumb.jpg"
                full_path  = SCRIPT_DIR / ".tmp_full.jpg"

                try:
                    process_image(photo, thumb_path, THUMB_MAX_SIZE, THUMB_QUALITY)
                    process_image(photo, full_path,  FULL_MAX_SIZE,  FULL_QUALITY)

                    # 上传缩略图 → thumbs/
                    upload_to_r2(s3, thumb_path, f"thumbs/{thumb_name}", "image/jpeg",
                                 "public, max-age=31536000, immutable")
                    print(f"  [缩略] {photo.name} → thumbs/{thumb_name}")

                    # 上传大图 → 根目录
                    upload_to_r2(s3, full_path, full_name, "image/jpeg",
                                 "public, max-age=31536000, immutable")
                    print(f"  [大图] {photo.name} → {full_name}")

                    # 更新缓存
                    cache[cache_key] = file_hash
                    uploaded += 1

                except Exception as e:
                    print(f"  [失败] {photo.name}: {e}")
                    failed += 1

                # 清理临时文件
                for tmp in [thumb_path, full_path]:
                    if tmp.exists():
                        tmp.unlink()
    else:
        print(f"\n未找到 photos/ 目录，跳过图片处理")
        print(f"请创建 {PHOTOS_DIR} 并放入系列文件夹")

    # 2) 上传 manifest.json
    print(f"\n{'─' * 60}")
    if MANIFEST.exists():
        try:
            upload_to_r2(s3, MANIFEST, "manifest.json", "application/json", "no-cache")
            print(f"[manifest] 上传成功 → manifest.json")
        except Exception as e:
            print(f"[manifest] 上传失败: {e}")
            failed += 1
    else:
        print(f"[manifest] 未找到 {MANIFEST}，跳过")

    # 3) 保存缓存
    save_cache(cache)

    # 4) 输出结果
    print(f"\n{'=' * 60}")
    print(f"同步完成！")
    print(f"  上传: {uploaded} 张")
    print(f"  跳过: {skipped} 张（未修改）")
    print(f"  失败: {failed} 张")
    print(f"  网站: https://photopage-8dh.pages.dev/")
    print(f"{'=' * 60}")


def check_config():
    if not all([ACCOUNT_ID, ACCESS_KEY, SECRET_KEY]):
        print("❌ 缺少 R2 凭证！请设置环境变量：")
        print("  export R2_ACCOUNT_ID='你的account_id'")
        print("  export R2_ACCESS_KEY='你的access_key'")
        print("  export R2_SECRET_KEY='你的secret_key'")
        print("  export R2_BUCKET='lucaliu-photos'")
        print("\n获取方式：Cloudflare 控制台 → R2 → Manage R2 API Tokens")
        sys.exit(1)


def create_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=R2_ENDPOINT,
        aws_access_key_id=ACCESS_KEY,
        aws_secret_access_key=SECRET_KEY,
        region_name="auto",
        config=Config(signature_version="s3v4"),
    )


def process_image(src, dst, max_size, quality):
    """缩放图片到指定大小"""
    img = Image.open(src)
    if img.mode in ('RGBA', 'P'):
        img = img.convert('RGB')

    # 只缩小，不放大
    w, h = img.size
    longest = max(w, h)
    if longest > max_size:
        scale = max_size / longest
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

    img.save(dst, "JPEG", quality=quality, optimize=True)


def upload_to_r2(s3, local_path, key, content_type, cache_control):
    """上传文件到 R2"""
    s3.upload_file(
        str(local_path), BUCKET, key,
        ExtraArgs={
            "ContentType": content_type,
            "CacheControl": cache_control,
        }
    )


def file_md5(path):
    """计算文件 MD5（用于检测变更）"""
    h = hashlib.md5()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            h.update(chunk)
    return h.hexdigest()


def load_cache():
    """加载同步缓存"""
    if CACHE_FILE.exists():
        try:
            with open(CACHE_FILE, 'r') as f:
                return json.load(f)
        except:
            pass
    return {}


def save_cache(cache):
    """保存同步缓存"""
    try:
        with open(CACHE_FILE, 'w') as f:
            json.dump(cache, f, indent=2)
    except:
        pass


if __name__ == "__main__":
    main()
