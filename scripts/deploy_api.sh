#!/bin/bash
# AgentStore API 部署到腾讯云
# 用法: ./scripts/deploy_api.sh

set -e

SERVER="tencent"
REMOTE_DIR="/opt/agentstore"

echo "[1/4] 同步代码到服务器..."
# 用 rsync 同步必要文件（排除 node_modules, .next, web/ 等前端文件）
rsync -avz --delete \
  --exclude='web/' \
  --exclude='node_modules/' \
  --exclude='.next/' \
  --exclude='__pycache__/' \
  --exclude='.env' \
  --exclude='*.pyc' \
  --exclude='.git/' \
  --exclude='.venv/' \
  --exclude='.pytest_cache/' \
  -e ssh \
  /Users/zekunmac/_HUB_LOCAL/AgentStore/ $SERVER:$REMOTE_DIR/

echo "[2/4] 同步环境变量..."
# .env 单独传（包含 API key）
scp /Users/zekunmac/_HUB_LOCAL/AgentStore/.env $SERVER:$REMOTE_DIR/.env

echo "[3/4] 构建并启动..."
ssh $SERVER "cd $REMOTE_DIR && docker compose up -d --build api"

echo "[4/4] 验证..."
sleep 5
ssh $SERVER "curl -s http://localhost:8002/api/v1/stats | python3 -m json.tool" || echo "API 可能还在启动中"

echo "部署完成！API 地址: http://服务器IP:8002"
