# Changelog

所有重要变更记录在此文件中。

## [1.0.0] - 2026-02-18

### 新增
- 200+ MCP 插件数据采集与 AI 五维评分系统
- 语义搜索（OpenAI embedding，支持跨语言）
- 插件横向对比（最多 4 个，叠加雷达图）
- 安全扫描模块（Semgrep + Trivy + SecretScanner）
- 用户系统（注册/登录/JWT 认证）
- 收藏功能（toggle + 收藏列表页）
- 评论系统（1-5 星评分 + 文字评论）
- 中/英双语国际化
- 数据可视化面板（分类饼图/评分直方图/语言排行）
- 管理后台（密码保护 + 数据质量监控）
- PWA 支持（manifest + 主屏安装）
- SEO 优化（sitemap + robots + OG 图片 + JSON-LD）
- 自动增量更新 Pipeline（cron 定时 + 增量 embedding）
- API 文档（Swagger + ReDoc）
- 6 个数据源（awesome-list × 2 + 官方仓库 + GitHub Search + Topics + npm）

### 技术栈
- 前端: Next.js 16 + Tailwind CSS（SSG 静态生成）
- 后端: FastAPI + SQLite（WAL 模式）
- AI: OpenAI GPT-4o-mini 评分 + text-embedding-3-small 语义搜索
- 部署: Vercel（前端）+ Docker（API）
