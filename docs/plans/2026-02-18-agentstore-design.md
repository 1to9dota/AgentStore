# AgentStore 设计文档

> Agent 能力注册表 + 信誉系统 —— Agent 世界的 DNS + 信用评级机构

## 1. 项目概述

### 1.1 背景

AI Agent 生态正在爆发（OpenClaw 20万+ GitHub star，ClawHub 3000+ skills），但面临三大问题：
- Agent 无法高效**发现**有某种能力的其他 Agent
- 没有统一的**信任评级**体系（ClawHavoc 恶意技能事件感染 9000+ 安装）
- 能力描述、质量标准**碎片化**（OpenWork / ClawNet / MoltRoad 各自为政）

### 1.2 定位

AgentStore = **发现层 + 信任层**

- 帮 Agent 找到靠谱的能力（发现）
- 给 Agent 能力打分/认证（信任）
- 不做交易层（留给 OpenWork / MoltRoad 等）

### 1.3 目标用户

- **能力消费者**：需要调用某种能力的 AI Agent
- **能力提供者**：希望被发现和信任的 Agent / 开发者
- **人类开发者**：浏览和评估 Agent 能力的人

## 2. 数据模型

```typescript
interface AgentCapability {
  id: string                    // 唯一标识
  name: string                  // "交易信号分析"、"文案写作"
  description: string           // 能力的详细描述
  source: "openclaw" | "mcp"    // 来源生态
  source_id: string             // 原始 skill/plugin 的 ID
  provider: string              // 提供者（GitHub user / agent ID）

  // 能力元信息
  category: string              // 分类：trading / writing / data / ...
  input_schema: object          // 这个能力需要什么输入
  output_schema: object         // 这个能力返回什么

  // 评级（5 维）
  scores: {
    reliability: number         // 可靠性
    safety: number              // 安全性
    capability: number          // 能力范围
    reputation: number          // 社区口碑
    usability: number           // 易用性
    overall: number             // 综合评分
  }

  // 调用信息
  endpoint: string              // 怎么调用（API URL / MCP server 地址）
  protocol: "rest" | "mcp" | "openclaw"

  created_at: string
  updated_at: string
}
```

## 3. 系统架构

```
┌─────────────────────────────────────────────┐
│                 AgentStore                   │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │ 数据管线  │  │ FastAPI  │  │  Next.js   │  │
│  │ (Python) │  │   API    │  │   前端     │  │
│  │          │  │          │  │           │  │
│  │ 采集     │  │ /search  │  │ 能力目录   │  │
│  │ 分析     │  │ /rate    │  │ 雷达图     │  │
│  │ 评分     │  │ /register│  │ 排行榜     │  │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘  │
│       │             │              │         │
│       └──────┬──────┘──────────────┘         │
│              │                               │
│       ┌──────┴──────┐                        │
│       │   SQLite     │                        │
│       │  能力注册表   │                        │
│       └─────────────┘                        │
└─────────────────────────────────────────────┘
         ↑                    ↑
    OpenClaw ClawHub     MCP Servers
    (3000+ skills)      (135+ plugins)
```

### 3.1 组件说明

| 组件 | 技术 | 职责 |
|------|------|------|
| 数据管线 | Python（复用 AgentRating） | 定期采集 OpenClaw/MCP 生态，AI 分析，评分 |
| API 服务 | FastAPI | Agent 查询能力、注册能力、获取评级 |
| 前端 | Next.js（复用 AgentRating） | 人类浏览、搜索、查看雷达图 |
| 数据库 | SQLite（MVP）→ PostgreSQL（后续） | 能力注册表、评分数据 |

## 4. API 设计

```
# 发现层 —— Agent 来找能力
GET  /api/v1/search?q=交易分析&category=trading
     → 返回匹配的能力列表，按 overall 评分排序

GET  /api/v1/capabilities/{id}
     → 返回单个能力的详细信息 + 5 维评分

GET  /api/v1/categories
     → 返回所有能力分类

# 信任层 —— Agent 来查评级
GET  /api/v1/capabilities/{id}/scores
     → 返回 5 维评分详情 + 评分依据

# 注册层 —— Agent/人类 来注册能力
POST /api/v1/capabilities
     → 提交新能力注册（需审核/自动评分后上线）

# 排行榜
GET  /api/v1/rankings?category=trading&sort=overall
     → 分类排行榜
```

**设计原则**：
- 接口极简，agent 一个 HTTP 请求就能拿到结果
- 无需认证即可查询（MVP 阶段免费开放）
- 注册需要 API key（防垃圾）

## 5. 评分引擎

### 5.1 五维评分

| 维度 | 权重 | 数据来源 | 计算逻辑 |
|------|------|---------|---------|
| 可靠性 (reliability) | 25% | 自动化测试 + 社区反馈 | 调用成功率、错误率、超时率 |
| 安全性 (safety) | 25% | AI 代码审计 + 权限分析 | 权限范围评估、已知漏洞检测、数据泄露风险 |
| 能力范围 (capability) | 20% | AI 分析能力描述 + 实测 | 功能覆盖度、输入输出完整性、边界情况 |
| 社区口碑 (reputation) | 15% | GitHub/ClawHub 数据 | star 数、安装量、issue 关闭率、维护频率 |
| 易用性 (usability) | 15% | AI 分析文档 + 接口设计 | 文档质量、示例完整性、接入步骤数 |

### 5.2 AI 分析引擎

支持多模型切换，配置化选择：

```env
AI_PROVIDER=openai        # openai | anthropic | ollama | gemini
OPENAI_API_KEY=sk-xxx
# 或
AI_PROVIDER=ollama
OLLAMA_MODEL=llama3
```

统一抽象层，一个接口适配所有模型：

```python
class AIAnalyzer:
    def analyze(self, capability_data) -> AnalysisResult:
        # 底层自动路由到对应 provider
```

### 5.3 评分流程

```
新能力注册 → 自动采集元数据 → AI 分析（多模型可选）
         → 5 维打分 → 人工复核（可选）→ 上线
```

## 6. 前端页面

| 页面 | 功能 | 复用度 |
|------|------|--------|
| 首页 | 分类概览 + 热门能力 + 搜索框 | 80% 复用 AgentRating |
| 分类页 | 按类别浏览能力列表，排序筛选 | 80% 复用 |
| 能力详情页 | 5 维雷达图 + 调用说明 + 接入指南 | 70% 复用 |
| 注册页 | 能力提供者提交新能力的表单 | 新做 |
| API 文档页 | 给开发者/agent 看的接口文档 | 新做 |

双语支持（中/英），复用 AgentRating 的 i18n 框架。

## 7. 商业模式

### 第一阶段：免费做生态（MVP）
- 全部功能免费开放
- 目标：agent 入驻量和查询量

### 第二阶段：变现（有量之后）
- 基础查询免费（每天 100 次）
- 高频调用按次收费
- "已认证"标签收费（能力提供者付费，提高被发现的优先级）

## 8. 数据源

### 8.1 OpenClaw 生态（主要）
- ClawHub 3000+ skills
- 采集：skill 元数据、安装量、评价、代码

### 8.2 MCP 生态（次要）
- 复用 AgentRating 已有的 135+ 插件数据
- 采集管线直接迁移

## 9. 技术复用清单

从 AgentRating 复用：
- [ ] Python 数据管线架构（discover → collect → analyze → score → output）
- [ ] AI 分析模块（升级为多模型支持）
- [ ] 5 维评分引擎（调整维度和权重）
- [ ] Next.js 前端框架 + 组件
- [ ] 雷达图组件
- [ ] i18n 双语框架
- [ ] SSG 数据加载逻辑
