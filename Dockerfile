# AgentStore API - Docker 镜像
FROM python:3.13-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件并安装
COPY pyproject.toml ./
RUN pip install --no-cache-dir .

# 复制项目代码
COPY api/ ./api/
COPY scripts/ ./scripts/
COPY data/ ./data/

# 创建数据目录（如果不存在）
RUN mkdir -p /app/data

# 暴露端口
EXPOSE 8002

# 启动 API 服务
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8002"]
