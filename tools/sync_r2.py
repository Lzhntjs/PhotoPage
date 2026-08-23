#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
==========================================================================
 声明式同步脚本 — manifest.json 为唯一真相源
 --------------------------------------------------------------------------
 原理：manifest.json 声明"R2 上应该有什么"，脚本让 R2 与它保持一致。

 执行后做三件事：
   1. 上传：manifest 中有但 R2 上没有的图片
   2. 删除：R2 上有但 manifest 中没有的图片（孤儿文件）
   3. 同步：上传最新的 manifest.json 到 R2

 这样：
   - 新增照片 → 放入 photofile/ → prepare_images.py → 编辑 manifest.json → sync_r2.py
   - 删除照片 → 从 manifest.json 中移除条目 → sync_r2.py（自动删除 R2 上的孤儿）
   - 不需要保留本地原图，manifest.json 就是记录

 用法：
   python3 tools/sync_r2.py           # 正常同步（上传+删除）
   python3 tools/sync_r2.py --dry    # 预览：只显示会做什么，不实际执行

 环境变量：
   R2_ACCOUNT_ID, R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET

 依赖：pip install boto3
==========================================================================
"""
import os
import sys
import json
from pathlib import Path

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

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "manifest.json"
THUMB_DIR = ROOT / "images" / "thumbnails"
WEB_DIR = ROOT / "r2-upload"
INVENTORY = ROOT / "tools" / "r2_inventory.json"  # 本地记录 R2 上的文件

R2_ENDPOINT = "https://{}.r2.cloudflarestorage.com".format(ACCOUNT_ID)


def main():
    check_config()
    dry = "--dry" in sys.argv

    s3 = create_s3_client()

    # 1. 读取 manifest.json，提取所有期望的文件名
    expected = parse_manifest()
    print(f"manifest.json 声明了 {len(expected)} 个图片文件")

    # 2. 列出 R2 上实际的文件
    actual = list_r2_files(s3)
    print(f"R2 上实际有 {len(actual)} 个文件（不含 manifest.json）")

    # 3. 计算差异
    to_upload = expected - actual    # manifest 有，R2 没有 → 上传
    to_delete = actual - expected    # R2 有，manifest 没有 → 删除

    print(f"\n需要上传: {len(to_upload)} 个")
    print(f"需要删除: {len(to_delete)} 个")

    if dry:
        print("\n[预览模式] 不实际执行")
        if to_upload:
            print("\n将上传:")
            for f in sorted(to_upload):
                print(f"  + {f}")
        if to_delete:
            print("\n将删除:")
            for f in sorted(to_delete):
                print(f"  - {f}")
        return

    # 4. 执行上传
    uploaded = 0
    for key in sorted(to_upload):
        local_path = find_local_file(key)
        if local_path:
            content_type = "image/jpeg"
            cache_control = "public, max-age=31536000, immutable"
            upload_to_r2(s3, local_path, key, content_type, cache_control)
            print(f"  [上传] {key}")
            uploaded += 1
        else:
            print(f"  [跳过] {key}（本地找不到源文件，可能已删除）")

    # 5. 执行删除
    deleted = 0
    for key in sorted(to_delete):
        delete_from_r2(s3, key)
        print(f"  [删除] {key}")
        deleted += 1

    # 6. 上传 manifest.json
    if MANIFEST.exists():
        upload_to_r2(s3, MANIFEST, "manifest.json", "application/json", "no-cache")
        print(f"\n  [manifest] manifest.json 已上传")

    # 7. 更新本地 inventory
    save_inventory(list(expected | actual - to_delete))

    # 8. 输出结果
    print(f"\n{'=' * 60}")
    print(f"同步完成！")
    print(f"  上传: {uploaded} 个")
    print(f"  删除: {deleted} 个")
    print(f"  R2 文件总数: {len(expected)} 个")
    print(f"{'=' * 60}")


def check_config():
    if not all([ACCOUNT_ID, ACCESS_KEY, SECRET_KEY]):
        print("❌ 缺少 R2 凭证！请设置环境变量：")
        print("  export R2_ACCOUNT_ID='xxx'")
        print("  export R2_ACCESS_KEY='xxx'")
        print("  export R2_SECRET_KEY='xxx'")
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


def parse_manifest():
    """从 manifest.json 提取所有期望的 R2 文件 key"""
    if not MANIFEST.exists():
        print(f"❌ 未找到 {MANIFEST}")
        sys.exit(1)

    with open(MANIFEST, 'r', encoding='utf-8') as f:
        data = json.load(f)

    expected = set()
    for series in data.get('series', []):
        # cover → thumbs/xxx.jpg
        if series.get('cover'):
            key = r2_key_from_url(series['cover'])
            if key:
                expected.add(key)
        # full → xxx.jpg
        if series.get('full'):
            key = r2_key_from_url(series['full'])
            if key:
                expected.add(key)
        # photos → xxx.jpg
        for photo in series.get('photos', []):
            if photo.get('src'):
                key = r2_key_from_url(photo['src'])
                if key:
                    expected.add(key)

    return expected


def r2_key_from_url(url):
    """从 R2 URL 提取 key（去掉域名前缀）"""
    # URL 格式: https://pub-xxx.r2.dev/thumbs/noncata-01.jpg → thumbs/noncata-01.jpg
    # 或: https://pub-xxx.r2.dev/noncata-01.jpg → noncata-01.jpg
    if '/r2.dev/' in url:
        return url.split('/r2.dev/', 1)[1]
    # 自定义域名情况
    for prefix in ['r2.dev/', 'cloudflarestorage.com/']:
        if prefix in url:
            parts = url.split(prefix, 1)
            if len(parts) > 1:
                # 可能还有 bucket 名
                remainder = parts[1]
                # 如果第一段是 bucket 名，跳过它
                slash = remainder.find('/')
                if slash != -1:
                    return remainder[slash + 1:]
                return remainder
    return None


def list_r2_files(s3):
    """列出 R2 桶里所有文件（不含 manifest.json）"""
    files = set()
    paginator = s3.get_paginator('list_objects_v2')
    for page in paginator.paginate(Bucket=BUCKET):
        for obj in page.get('Contents', []):
            key = obj['Key']
            if key != 'manifest.json':
                files.add(key)
    return files


def find_local_file(key):
    """根据 R2 key 找到本地源文件"""
    # key 格式: thumbs/noncata-01.jpg 或 noncata-01.jpg
    filename = key.split('/')[-1]  # noncata-01.jpg

    # 大图：r2-upload/noncata-01.jpg
    full_path = WEB_DIR / filename
    if key.startswith('thumbs/'):
        # 缩略图：images/thumbnails/noncata-01.jpg
        thumb_path = THUMB_DIR / filename
        if thumb_path.exists():
            return str(thumb_path)
        # 如果缩略图不存在但大图存在，跳过（缩略图应由 prepare_images.py 生成）
        return None

    if full_path.exists():
        return str(full_path)
    return None


def upload_to_r2(s3, local_path, key, content_type, cache_control):
    s3.upload_file(
        str(local_path), BUCKET, key,
        ExtraArgs={
            "ContentType": content_type,
            "CacheControl": cache_control,
        }
    )


def delete_from_r2(s3, key):
    s3.delete_object(Bucket=BUCKET, Key=key)


def save_inventory(files):
    """保存本地 inventory 记录"""
    INVENTORY.parent.mkdir(parents=True, exist_ok=True)
    with open(INVENTORY, 'w', encoding='utf-8') as f:
        json.dump(sorted(files), f, indent=2, ensure_ascii=False)
    print(f"\n本地 inventory 已更新: {INVENTORY}")


if __name__ == "__main__":
    main()
