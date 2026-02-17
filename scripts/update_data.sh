#!/bin/bash
# scripts/update_data.sh — AgentStore 数据更新管线
# 跑管线 → seed 数据库 → 同步到前端
set -e

PROJECT_DIR="/Users/zekunmac/_HUB_LOCAL/AgentStore"
cd "$PROJECT_DIR"

echo "=== AgentStore 数据更新 ==="

# 步骤 1: 跑数据管线
echo "[1/3] 运行数据管线..."
python -m scripts.pipeline
echo "  数据管线完成。"

# 步骤 2: seed 数据库
echo "[2/3] 导入数据到数据库..."
python scripts/seed_db.py
echo "  数据库 seed 完成。"

# 步骤 3: 同步数据到前端
echo "[3/3] 同步数据到前端..."
mkdir -p "$PROJECT_DIR/web/data"
cp -f "$PROJECT_DIR/data/"*.json "$PROJECT_DIR/web/data/" 2>/dev/null || true
echo "  数据已同步到 web/data/。"

echo ""
echo "=== 数据更新完成 ==="
echo "数据库: $PROJECT_DIR/data/agentstore.db"
echo "前端数据: $PROJECT_DIR/web/data/"
