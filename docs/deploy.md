# AgentStore 部署文档

## 架构概览

```
用户 → Vercel (前端 Next.js SSG) → 静态页面
                                    ↓ (数据来自构建时 JSON)
腾讯云 → Docker (FastAPI API) → SQLite
                ↑
        cron 定时更新数据
```

- **前端**：Next.js SSG，部署在 Vercel，构建时从 `web/data/capabilities.json` 读取数据
- **API**：FastAPI + SQLite，部署在腾讯云 Docker
- **数据更新**：腾讯云 cron 定时运行 pipeline，生成新数据后触发 Vercel 重新构建

---

## 一、前端 Vercel 部署

### 前提条件
- 已安装 Vercel CLI：`npm i -g vercel`
- 已有 GitHub 仓库：`gh repo create AgentStore --public --source=. --push`

### 方式 A：通过 GitHub 自动部署（推荐）

1. 在 [vercel.com](https://vercel.com) 导入 GitHub 仓库
2. 配置：
   - **Root Directory**: `web`
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
3. 每次 push 到 main/master 分支自动触发部署

### 方式 B：命令行部署

```bash
cd web
vercel --prod
```

首次部署时会要求选择项目设置，按提示操作即可。

### 数据更新触发重新构建

在 Vercel 项目设置中创建 Deploy Hook：
1. Settings → Git → Deploy Hooks
2. 创建 Hook，命名为 `data-update`
3. 记录 Hook URL，后续在腾讯云 cron 中使用

```bash
# 触发 Vercel 重新构建
curl -X POST https://api.vercel.com/v1/integrations/deploy/YOUR_HOOK_ID
```

---

## 二、API Docker 部署到腾讯云

### 连接服务器

```bash
ssh tencent  # 端口 2222
```

### 首次部署

```bash
# 1. 克隆代码
git clone https://github.com/1to9dota/AgentStore.git
cd AgentStore

# 2. 创建环境变量文件
cp .env.example .env
# 编辑 .env 填入实际的 API key
vim .env

# 3. 构建并启动
docker compose up -d api

# 4. 初始化数据库（首次）
docker compose exec api python -m scripts.seed_db

# 5. 验证服务运行
curl http://localhost:8002/docs
```

### 更新部署

```bash
cd AgentStore
git pull
docker compose up -d --build api
```

### 查看日志

```bash
docker compose logs -f api
```

---

## 三、定时数据更新（Cron）

在腾讯云服务器上配置 cron 任务：

```bash
crontab -e
```

添加以下内容（每天凌晨 3 点更新数据）：

```cron
# AgentStore 数据更新 + 触发 Vercel 重建
0 3 * * * cd /root/AgentStore && bash scripts/update_data.sh >> /var/log/agentstore-update.log 2>&1
```

### update_data.sh 需要做的事情

1. 运行 pipeline 更新数据（discover → collect → analyze → score → output）
2. 将新的 `data/capabilities.json` 复制到 `web/data/capabilities.json`
3. Git commit + push（触发 Vercel 自动重建）
4. 或者直接 curl Vercel Deploy Hook

---

## 四、环境变量说明

### API 服务器（.env）

| 变量 | 说明 | 必需 |
|------|------|------|
| `AI_PROVIDER` | AI 分析引擎 (openai/anthropic/gemini/ollama) | 是 |
| `OPENAI_API_KEY` | OpenAI API Key | 当 AI_PROVIDER=openai 时 |
| `ANTHROPIC_API_KEY` | Anthropic API Key | 当 AI_PROVIDER=anthropic 时 |
| `GEMINI_API_KEY` | Google Gemini API Key | 当 AI_PROVIDER=gemini 时 |
| `OLLAMA_MODEL` | Ollama 本地模型名 | 当 AI_PROVIDER=ollama 时 |
| `GITHUB_TOKEN` | GitHub Personal Access Token | 是（数据采集需要） |
| `CLAWHUB_API_URL` | OpenClaw ClawHub API 地址 | 否 |
| `DATABASE_PATH` | SQLite 数据库路径 | 否（默认 data/agentstore.db） |

### Vercel 前端

前端是纯 SSG，构建时从本地 JSON 文件读数据，**不需要运行时环境变量**。

---

## 五、端口规划

| 服务 | 端口 | 说明 |
|------|------|------|
| API (Docker) | 8002 | FastAPI REST API |
| Web (Vercel) | - | Vercel 托管，无需端口 |
| Web (本地开发) | 3002 | Next.js dev server |

---

## 六、常见问题

### Q: Vercel 构建失败，找不到 capabilities.json？
A: 确保 `web/data/capabilities.json` 已 commit 到 Git。这个文件是构建时的数据源。

### Q: API 服务启动失败？
A: 检查 `.env` 文件是否存在且配置正确。查看日志：`docker compose logs api`

### Q: 如何手动触发数据更新？
A: 在腾讯云服务器上执行：`cd AgentStore && bash scripts/update_data.sh`
