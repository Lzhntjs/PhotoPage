#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
==========================================================================
 LucaLiu Photography — Cloudflare R2 批量上传脚本
 --------------------------------------------------------------------------
 把本地两类图片批量上传到 R2：
   images/thumbnails/*.jpg  →  R2 的 thumbs/   目录（1920px 缩略图，网站 cover/photos 引用）
   r2-upload/*.jpg          →  R2 根目录        （3000px 展示大图，full/灯箱引用）

 用法（在项目根目录 d:\\photoweb 下执行）：
   1. 在 Cloudflare 创建 R2 API Token（见 README 或下方说明），拿到 4 个值
   2. 填到本脚本顶部的 4 个变量里（或用环境变量）
   3. python tools/upload_to_r2.py

 依赖：pip install boto3
 --------------------------------------------------------------------------
 R2 API Token 创建位置：
   Cloudflare 控制台 → R2 → 右上角 "Manage R2 API Tokens" → Create API token
   权限选：Object Read & Write
   指定 bucket：选你创建的那个（如 lucaliu-photos）
   创建后会显示：Account ID、Access Key ID、Secret Access Key（只显示一次，记好！）
==========================================================================
"""
import os
import sys
from pathlib import Path

# ====== 在这里填入你的 R2 凭证（或用环境变量 R2_ACCOUNT_ID 等） ======
ACCOUNT_ID    = os.environ.get("R2_ACCOUNT_ID",    "")
ACCESS_KEY    = os.environ.get("R2_ACCESS_KEY",    "")
SECRET_KEY    = os.environ.get("R2_SECRET_KEY",     "")
BUCKET        = os.environ.get("R2_BUCKET",        "lucaliu-photos")
# =====================================================================

ROOT = Path(__file__).resolve().parent.parent
THUMB_DIR = ROOT / "images" / "thumbnails"
WEB_DIR = ROOT / "r2-upload"

R2_ENDPOINT = "https://{acct}.r2.cloudflarestorage.com".format(acct=ACCOUNT_ID)


def main():
    if not ACCOUNT_ID or not ACCESS_KEY or not SECRET_KEY:
        print("⚠ 缺少 R2 凭证。请填写本脚本顶部的 4 个变量，或设置环境变量：")
        print("  R2_ACCOUNT_ID, R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET")
        print("\n获取方式：Cloudflare 控制台 → R2 → Manage R2 API Tokens → Create API token")
        sys.exit(1)

    try:
        import boto3
        from botocore.config import Config
    except ImportError:
        print("缺少依赖 boto3。请先执行：pip install boto3")
        sys.exit(1)

    s3 = boto3.client(
        "s3",
        endpoint_url=R2_ENDPOINT,
        aws_access_key_id=ACCESS_KEY,
        aws_secret_access_key=SECRET_KEY,
        region_name="auto",
        config=Config(signature_version="s3v4"),
    )

    # 1) 缩略图 → thumbs/ 目录
    thumbs = sorted(THUMB_DIR.glob("*.jpg")) if THUMB_DIR.exists() else []
    print("\n[1/2] 上传缩略图（1920px）→ thumbs/ 目录...")
    ok = fail = 0
    for p in thumbs:
        key = "thumbs/" + p.name
        try:
            s3.upload_file(str(p), BUCKET, key, ExtraArgs={"ContentType": "image/jpeg", "CacheControl": "public, max-age=31536000, immutable"})
            ok += 1
            print("  [OK]   {} → {}".format(p.name, key))
        except Exception as e:
            fail += 1
            print("  [FAIL] {} : {}".format(p.name, e))

    # 2) 展示大图 → 根目录
    webs = sorted(WEB_DIR.glob("*.jpg")) if WEB_DIR.exists() else []
    print("\n[2/2] 上传展示大图（3000px）→ 根目录...")
    for p in webs:
        key = p.name
        try:
            s3.upload_file(str(p), BUCKET, key, ExtraArgs={"ContentType": "image/jpeg", "CacheControl": "public, max-age=31536000, immutable"})
            ok += 1
            print("  [OK]   {} → {}".format(p.name, key))
        except Exception as e:
            fail += 1
            print("  [FAIL] {} : {}".format(p.name, e))

    print("\n========== 上传完成 ==========")
    print("成功 {} 张，失败 {} 张".format(ok, fail))
    print("\n下一步：开启 bucket 公共访问后，把公共访问基址告诉我，")
    print("我会重跑 prepare_images.py --r2-base <基址> 切换 data.js 到 R2 地址。")


if __name__ == "__main__":
    main()
