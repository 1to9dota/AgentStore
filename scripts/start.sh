#!/bin/bash
# scripts/start.sh — AgentStore 一键启动
set -e

PROJECT_DIR="/Users/zekunmac/_HUB_LOCAL/AgentStore"
cd "$PROJECT_DIR"

echo "=== AgentStore 启动 ==="

# 启动 API 服务
echo "[1/2] 启动 FastAPI API (port 8002)..."
uv run uvicorn api.main:app --host 0.0.0.0 --port 8002 --reload &
API_PID=$!

# 启动前端
echo "[2/2] 启动 Next.js 前端 (port 3002)..."
cd web && npm run dev -- -p 3002 &
FRONT_PID=$!

echo ""
echo "=== AgentStore 已启动 ==="
echo "API:    http://localhost:8002/docs"
echo "前端:   http://localhost:3002"
echo ""
echo "按 Ctrl+C 停止所有服务"

trap "kill $API_PID $FRONT_PID 2>/dev/null" EXIT
wait
