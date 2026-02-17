# AgentStore

**MCP 插件评级平台 -- 发现、评估、比较 AI Agent 能力**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 功能亮点

| | 功能 | 说明 |
|---|---|---|
| :brain: | **AI 驱动的五维评分** | 可靠性 / 安全性 / 能力 / 声誉 / 易用性，全方位量化评估 |
| :package: | **200+ MCP 插件收录** | 自动抓取 awesome-mcp-servers + OpenClaw 生态，持续扩充 |
| :mag: | **语义搜索** | 基于 OpenAI Embedding，跨语言理解查询意图 |
| :bar_chart: | **插件横向对比** | 多插件并排比较评分与特性，辅助技术选型 |
| :shield: | **安全扫描** | 自动扫描代码仓库，识别潜在安全风险 |
| :bust_in_silhouette: | **用户系统** | 注册登录、收藏插件、发表评论评分 |
| :globe_with_meridians: | **中/英双语** | 国际化支持，面向全球开发者 |
| :chart_with_upwards_trend: | **数据可视化面板** | 平台统计概览，分类分布、评分趋势一目了然 |

---

## 在线体验

- 线上地址: **https://web-rosy-iota-18.vercel.app**
- API 交互文档: `/docs` (Swagger UI) | `/redoc` (ReDoc)

---

## 技术架构

```
┌─────────────────────────────────────────────────┐
│                   用户浏览器                      │
└──────────────────────┬──────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        ▼                             ▼
┌───────────────┐           ┌─────────────────┐
│   前端 (Web)   │           │   后端 (API)     │
│  Next.js 16   │◄─────────►│   FastAPI        │
│  Tailwind CSS │   REST    │   SQLite         │
│  SSG 静态生成  │           │   JWT 认证       │
│  Vercel 部署  │           │   Docker 部署    │
└───────────────┘           └────────┬────────┘
                                     │
                            ┌────────┴────────┐
                            ▼                 ▼
                    ┌──────────────┐  ┌──────────────┐
                    │  数据管线     │  │  Embedding   │
                    │  GitHub API  │  │  OpenAI API  │
                    │  AI 分析     │  │  语义搜索     │
                    │  安全扫描    │  │              │
                    └──────────────┘  └──────────────┘
```

| 层 | 技术栈 |
|---|---|
| **前端** | Next.js 16 + React 19 + Tailwind CSS v4 (SSG 静态生成) |
| **后端** | FastAPI + SQLite + JWT 认证 |
| **数据管线** | Python (GitHub API + OpenAI gpt-4o-mini + 安全扫描器) |
| **部署** | Vercel (前端) + Docker (API) |

---

## 快速开始

### 环境要求

- Python >= 3.11
- Node.js >= 18
- [uv](https://docs.astral.sh/uv/) (推荐) 或 pip

### 1. 克隆仓库

```bash
git clone https://github.com/1to9dota/AgentStore.git
cd AgentStore
```

### 2. 安装后端依赖

```bash
# 使用 uv（推荐）
uv sync

# 或使用 pip
pip install -e .
```

### 3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
GITHUB_TOKEN=your_github_token          # GitHub API 访问（必须）
OPENAI_API_KEY=your_openai_api_key      # AI 分析 + 语义搜索（必须）
JWT_SECRET_KEY=your_jwt_secret          # 用户认证密钥（生产环境必须）
```

### 4. 运行数据管线

```bash
# 发现 + 采集 + 扫描 + 分析 + 评分，一键完成
python -m scripts.pipeline
```

### 5. 启动后端 API

```bash
uvicorn api.main:app --host 0.0.0.0 --port 8002 --reload
```

### 6. 启动前端

```bash
cd web
npm install
npm run dev
```

访问 http://localhost:3000 查看前端，http://localhost:8002/docs 查看 API 文档。

### Docker 部署（可选）

```bash
docker-compose up -d
```

前端访问 `http://localhost:3002`，API 访问 `http://localhost:8002`。

---

## 项目结构

```
AgentStore/
├── api/                    # FastAPI 后端
│   ├── main.py             # API 入口 + 路由定义
│   ├── database.py         # SQLite 数据库操作
│   ├── users.py            # 用户系统（注册/登录/收藏/评论）
│   └── schemas.py          # Pydantic 响应模型
├── scripts/                # 数据管线
│   ├── pipeline.py         # 主管线：discover → collect → scan → analyze → score
│   ├── discover_mcp.py     # MCP 插件发现（awesome-mcp-servers）
│   ├── discover_openclaw.py# OpenClaw 插件发现
│   ├── collect.py          # GitHub 仓库数据采集
│   ├── ai_analyzer.py      # AI 分析（OpenAI）
│   ├── scanner.py          # 安全扫描器
│   ├── score.py            # 五维评分计算
│   ├── embeddings.py       # OpenAI Embedding 生成
│   ├── seed_db.py          # 数据库初始化
│   └── auto_update.py      # 自动更新任务
├── web/                    # Next.js 前端
│   └── src/
│       ├── app/            # 页面路由
│       ├── components/     # UI 组件
│       ├── hooks/          # React Hooks
│       ├── i18n/           # 国际化（中/英）
│       └── lib/            # 工具函数
├── data/                   # 数据文件
│   ├── capabilities.json   # 插件数据
│   ├── embeddings.json     # 向量数据
│   └── agentstore.db       # SQLite 数据库
├── docs/                   # 项目文档
├── docker-compose.yml      # Docker 编排
├── Dockerfile              # API Docker 镜像
└── pyproject.toml          # Python 依赖管理
```

---

## API 端点

### 公开端点

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/v1/search` | 关键词搜索，支持分类筛选、排序、分页 |
| `GET` | `/api/v1/capabilities/{slug}` | 获取插件详情（含五维评分） |
| `GET` | `/api/v1/capabilities/{slug}/scores` | 仅获取评分数据 |
| `GET` | `/api/v1/categories` | 获取所有分类列表 |
| `GET` | `/api/v1/rankings` | 排行榜（按评分/Star 数等） |
| `GET` | `/api/v1/semantic-search` | 语义搜索（自然语言查询） |
| `GET` | `/api/v1/stats` | 平台统计数据 |
| `GET` | `/api/v1/comments/{slug}` | 获取插件评论 |

### 认证端点

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/v1/auth/register` | 用户注册 |
| `POST` | `/api/v1/auth/login` | 用户登录 |
| `GET` | `/api/v1/users/me` | 获取当前用户信息 |
| `POST` | `/api/v1/favorites/{slug}` | 收藏/取消收藏 |
| `GET` | `/api/v1/favorites` | 获取收藏列表 |
| `POST` | `/api/v1/comments/{slug}` | 发表评论 |

完整 API 文档请访问 `/docs` (Swagger UI) 或查看 [docs/api.md](docs/api.md)。

---

## Contributing

欢迎贡献代码！无论是修复 bug、新增功能还是改进文档，我们都非常感谢。

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 发起 Pull Request

---

## License

本项目采用 [MIT License](LICENSE) 开源协议。
