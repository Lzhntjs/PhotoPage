#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
配置 R2 bucket 的 CORS 规则，允许网站通过 fetch 读取 manifest.json
用法：python3 tools/configure_r2_cors.py
需要环境变量：R2_ACCOUNT_ID, R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET
"""
import os
import sys
import json

ACCOUNT_ID = os.environ.get("R2_ACCOUNT_ID", "")
ACCESS_KEY = os.environ.get("R2_ACCESS_KEY", "")
SECRET_KEY = os.environ.get("R2_SECRET_KEY", "")
BUCKET     = os.environ.get("R2_BUCKET", "lucaliu-photos")

if not all([ACCOUNT_ID, ACCESS_KEY, SECRET_KEY]):
    print("缺少 R2 凭证，请设置环境变量：")
    print("  R2_ACCOUNT_ID, R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET")
    sys.exit(1)

try:
    import boto3
    from botocore.config import Config
except ImportError:
    print("缺少依赖 boto3，请执行：pip install boto3")
    sys.exit(1)

ENDPOINT = "https://{}.r2.cloudflarestorage.com".format(ACCOUNT_ID)

s3 = boto3.client(
    "s3",
    endpoint_url=ENDPOINT,
    aws_access_key_id=ACCESS_KEY,
    aws_secret_access_key=SECRET_KEY,
    region_name="auto",
    config=Config(signature_version="s3v4"),
)

# CORS 规则：允许所有来源的 GET 请求
cors_config = {
    "CORSRules": [
        {
            "AllowedOrigins": ["*"],
            "AllowedMethods": ["GET"],
            "AllowedHeaders": ["*"],
            "MaxAgeSeconds": 3600
        }
    ]
}

print("正在配置 CORS 规则...")
try:
    s3.put_bucket_cors(Bucket=BUCKET, CORSConfiguration=cors_config)
    print("✅ CORS 配置成功！")
    print("   允许所有来源的 GET 请求")
except Exception as e:
    print("❌ CORS 配置失败：{}".format(e))
    sys.exit(1)
