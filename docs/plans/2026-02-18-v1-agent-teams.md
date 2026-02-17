# AgentStore V1.0 — Agent Teams 并行开发计划

> **For Claude:** 3 个 Agent Teammate 并行执行，代码互不冲突。

**Goal:** 把 AgentStore 从 10 个插件的 demo 升级为 100+ 插件的可上线产品

**Architecture:** 三个独立模块并行开发，分别改 scripts/、web/、api/ + 根目录

---

## Teammate 1: 数据扩展 Agent（改 scripts/）

### Task 1.1: 扩展 MCP 采集到 100+
**Files:**
- Modify: `scripts/discover_mcp.py` — 解析更多条目，支持分页
- Modify: `scripts/collect.py` — 增加错误重试、rate limit 处理
- Modify: `scripts/pipeline.py` — 默认 mcp_limit=200

**要求:**
- awesome-mcp-servers 的 README 有 500+ 个插件，当前正则只解析了部分
- 给 collect.py 加 3 次重试 + exponential backoff
- GitHub API 有 rate limit，无 token 60/h，有 token 5000/h，要处理 403
- 采集过程加进度条（print 百分比即可）

### Task 1.2: 增量更新
**Files:**
- Modify: `scripts/pipeline.py` — 读取已有 capabilities.json，只处理新增的

**要求:**
- 如果 slug 已存在于 capabilities.json，跳过（除非加 --force 参数）
- 打印跳过了几个、新增了几个

### Task 1.3: 数据质量
**Files:**
- Modify: `scripts/ai_analyzer.py` — prompt 优化，评分更准确
- Modify: `scripts/score.py` — 没有 README 的项目降权

**要求:**
- readme_length < 100 的项目，usability_score 直接设为 0
- AI prompt 要求返回中文 summary

---

## Teammate 2: 前端增强 Agent（改 web/）

### Task 2.1: 真正可用的搜索
**Files:**
- Modify: `web/src/app/page.tsx` — 首页搜索框实际可用
- Create: `web/src/app/search/page.tsx` — 搜索结果页

**要求:**
- 搜索走客户端过滤（SSG 数据已全量加载）
- 支持按名称、描述、provider 搜索
- 搜索结果高亮匹配文字

### Task 2.2: 分类筛选 + 排序
**Files:**
- Modify: `web/src/app/category/[slug]/page.tsx` — 增加排序（评分/stars/更新时间）
- Modify: `web/src/app/page.tsx` — 首页分类标签可点击筛选

**要求:**
- 排序用客户端 state 切换，不刷新页面
- 默认按 overall_score 降序

### Task 2.3: UI 优化
**Files:**
- Modify: `web/src/app/layout.tsx` — 顶部导航栏
- Modify: `web/src/components/CapabilityCard.tsx` — 卡片显示更多信息（语言标签、stars）
- Create: `web/src/components/Navbar.tsx` — 全局导航

**要求:**
- 导航栏：Logo + 首页 + 分类 + 关于
- 卡片加上语言标签（TypeScript/Python/Rust 等）和 star 数
- 移动端响应式

---

## Teammate 3: API + 部署 Agent（改 api/ + 根目录）

### Task 3.1: API 增强
**Files:**
- Modify: `api/main.py` — 分页、排序参数、模糊搜索
- Modify: `api/database.py` — SQL 支持 LIKE 搜索、ORDER BY、OFFSET/LIMIT

**要求:**
- GET /api/v1/search?q=xxx&category=xxx&sort=overall_score&order=desc&page=1&per_page=20
- 返回格式加 total_pages、current_page
- 加 /api/v1/stats 接口：总数、各分类数量、平均分

### Task 3.2: Docker 部署
**Files:**
- Create: `Dockerfile` — Python API + 数据文件
- Create: `docker-compose.yml` — API + 前端 + 定时采集

**要求:**
- API 用 Python slim 镜像
- 前端用 Node Alpine 构建后 Nginx 部署
- docker-compose 一键启动

### Task 3.3: 自动化脚本
**Files:**
- Modify: `scripts/start.sh` — 支持 dev / prod 模式
- Create: `scripts/update_data.sh` — 一键更新数据（跑管线 + seed db + 刷新前端数据）

**要求:**
- `./scripts/start.sh dev` 启动开发环境
- `./scripts/start.sh prod` 用 Docker 启动
- `./scripts/update_data.sh` 跑管线并自动刷新

---

## 执行顺序

三个 Teammate 完全并行，无依赖。完成后合并验证。
