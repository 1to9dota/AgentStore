#!/bin/bash
# scripts/cron_setup.sh — 配置 cron 定时增量更新
# 每天凌晨 3 点执行增量更新，日志写入 data/cron.log
set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PYTHON_BIN="$(which python3 || which python)"
CRON_LOG="$PROJECT_DIR/data/cron.log"

# 确保 data 目录存在
mkdir -p "$PROJECT_DIR/data"

# cron 任务内容：
# - 加载 .env 环境变量（GITHUB_TOKEN、OPENAI_API_KEY 等）
# - 每天凌晨 3:00 执行增量更新
# - 输出追加到 cron.log
CRON_CMD="0 3 * * * cd $PROJECT_DIR && set -a && . $PROJECT_DIR/.env && set +a && $PYTHON_BIN -m scripts.auto_update >> $CRON_LOG 2>&1"

# 检查是否已存在该 cron 任务
EXISTING=$(crontab -l 2>/dev/null || true)
if echo "$EXISTING" | grep -qF "scripts.auto_update"; then
    echo "cron 任务已存在，跳过添加。"
    echo "当前 cron 任务："
    echo "$EXISTING" | grep "auto_update"
    exit 0
fi

# 追加新 cron 任务（保留已有任务）
(echo "$EXISTING"; echo "$CRON_CMD") | crontab -

echo "cron 任务已添加："
echo "  时间: 每天凌晨 3:00"
echo "  命令: python -m scripts.auto_update"
echo "  日志: $CRON_LOG"
echo ""
echo "查看当前 cron 任务: crontab -l"
echo "删除此任务: crontab -e 手动删除对应行"
