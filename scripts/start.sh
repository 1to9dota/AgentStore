#!/bin/bash
# scripts/start.sh — AgentStore 一键启动
# 用法: ./scripts/start.sh [dev|prod]
set -e

PROJECT_DIR="/Users/zekunmac/_HUB_LOCAL/AgentStore"
cd "$PROJECT_DIR"

MODE="${1:-dev}"

echo "=== AgentStore 启动 (模式: $MODE) ==="

if [ "$MODE" = "prod" ]; then
    # 生产模式：Docker Compose
    echo "使用 Docker Compose 启动生产环境..."
    docker-compose up -d --build
    echo ""
    echo "=== AgentStore 生产环境已启动 ==="
    echo "API:    http://localhost:8002/docs"
    echo "前端:   http://localhost:3002"
    echo ""
    echo "查看日志: docker-compose logs -f"
    echo "停止服务: docker-compose down"
else
    # 开发模式：直接启动
    echo "[1/2] 启动 FastAPI API (port 8002)..."
    uv run uvicorn api.main:app --host 0.0.0.0 --port 8002 --reload &
    API_PID=$!

    echo "[2/2] 启动 Next.js 前端 (port 3002)..."
    cd "$PROJECT_DIR/web" && npm run dev -- -p 3002 &
    FRONT_PID=$!

    echo ""
    echo "=== AgentStore 开发环境已启动 ==="
    echo "API:    http://localhost:8002/docs"
    echo "前端:   http://localhost:3002"
    echo ""
    echo "按 Ctrl+C 停止所有服务"

    trap "kill $API_PID $FRONT_PID 2>/dev/null" EXIT
    wait
fi
