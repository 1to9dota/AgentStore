# AgentStore API 文档

> Base URL: `https://your-domain`
>
> 交互式文档: `/docs` (Swagger UI) | `/redoc` (ReDoc)
>
> OpenAPI Schema: `/api/v1/openapi.json`

## 认证

当前版本 **无需认证**，所有端点公开访问。

未来计划：
- API Key 认证（通过 `X-API-Key` 请求头）
- OAuth 2.0（用于第三方集成）

## 速率限制

当前版本 **无速率限制**。

未来计划：
- 匿名请求：60 次/分钟
- 认证用户：600 次/分钟
- 超限返回 `429 Too Many Requests`

## 返回格式

所有端点返回 JSON。通用约定：

- 日期字段使用 ISO 8601 格式（如 `2026-02-18T12:00:00`）
- 评分范围 0-10（浮点数）
- 错误统一返回 `{"detail": "错误描述"}`

---

## 端点列表

### 1. 搜索能力

```
GET /api/v1/search
```

根据关键词搜索 Agent 能力，支持分类筛选、排序和分页。

**参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `q` | string | `""` | 搜索关键词，匹配名称/描述/提供者 |
| `category` | string | `""` | 按分类筛选 |
| `sort` | string | `overall_score` | 排序字段：`overall_score` / `stars` / `last_updated` / `name` / `created_at` |
| `order` | string | `desc` | 排序方向：`asc` / `desc` |
| `page` | int | `1` | 页码（>=1） |
| `per_page` | int | `20` | 每页数量（1-200） |

**示例：**

```bash
# 搜索包含 "mcp" 的能力
curl "https://your-domain/api/v1/search?q=mcp"

# 按 Star 数降序，取第 2 页
curl "https://your-domain/api/v1/search?sort=stars&page=2&per_page=10"

# 筛选 coding 分类
curl "https://your-domain/api/v1/search?category=coding&sort=overall_score"
```

**返回：**

```json
{
  "results": [
    {
      "slug": "example-mcp-server",
      "name": "Example MCP Server",
      "provider": "example-org",
      "description": "一个示例 MCP 服务器",
      "category": "coding",
      "stars": 1200,
      "overall_score": 8.5,
      "scores": {
        "reliability": 8.0,
        "safety": 9.0,
        "capability": 8.5,
        "reputation": 8.0,
        "usability": 9.0
      }
    }
  ],
  "total": 42,
  "page": 1,
  "per_page": 20,
  "total_pages": 3
}
```

---

### 2. 获取能力详情

```
GET /api/v1/capabilities/{slug}
```

获取单个能力的完整信息。

**示例：**

```bash
curl "https://your-domain/api/v1/capabilities/modelcontextprotocol-servers"
```

**返回：** 完整的 capability 对象（包含评分、AI 摘要、安装指南等全部字段）。

**错误码：**

| 状态码 | 说明 |
|--------|------|
| 404 | 能力不存在 |

---

### 3. 获取能力评分

```
GET /api/v1/capabilities/{slug}/scores
```

仅获取五维评分和综合分。

**示例：**

```bash
curl "https://your-domain/api/v1/capabilities/modelcontextprotocol-servers/scores"
```

**返回：**

```json
{
  "slug": "modelcontextprotocol-servers",
  "scores": {
    "reliability": 8.0,
    "safety": 9.0,
    "capability": 8.5,
    "reputation": 8.0,
    "usability": 9.0
  },
  "overall_score": 8.5
}
```

**错误码：**

| 状态码 | 说明 |
|--------|------|
| 404 | 能力不存在 |

---

### 4. 获取所有分类

```
GET /api/v1/categories
```

返回平台中所有分类名称。

**示例：**

```bash
curl "https://your-domain/api/v1/categories"
```

**返回：**

```json
{
  "categories": ["coding", "data", "devops", "security", "testing"]
}
```

---

### 5. 排行榜

```
GET /api/v1/rankings
```

按指定维度获取排行榜。

**参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `category` | string | `""` | 按分类筛选 |
| `sort` | string | `overall_score` | 排序字段 |
| `order` | string | `desc` | 排序方向 |
| `limit` | int | `50` | 返回数量（1-200） |

**示例：**

```bash
# 综合评分 Top 10
curl "https://your-domain/api/v1/rankings?limit=10"

# coding 分类 Star 数排行
curl "https://your-domain/api/v1/rankings?category=coding&sort=stars&limit=20"
```

**返回：**

```json
{
  "results": [...],
  "total": 135
}
```

---

### 6. 语义搜索

```
GET /api/v1/semantic-search
```

基于 OpenAI Embedding 的语义搜索，能理解自然语言查询意图。

> 需要服务端配置 `OPENAI_API_KEY` 环境变量。

**参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `q` | string | （必填） | 自然语言查询 |
| `limit` | int | `10` | 返回数量（1-50） |

**示例：**

```bash
# 语义搜索
curl "https://your-domain/api/v1/semantic-search?q=帮我处理PDF文件"
```

**返回：**

```json
{
  "results": [
    {
      "slug": "pdf-processor",
      "name": "PDF Processor",
      "similarity": 0.9231,
      "..."
    }
  ],
  "total": 5,
  "query": "帮我处理PDF文件"
}
```

**错误码：**

| 状态码 | 说明 |
|--------|------|
| 503 | OpenAI API Key 未配置 |

---

### 7. 平台统计

```
GET /api/v1/stats
```

返回平台整体统计数据。

**示例：**

```bash
curl "https://your-domain/api/v1/stats"
```

**返回：**

```json
{
  "total": 135,
  "categories": {
    "coding": 45,
    "data": 30,
    "devops": 20
  },
  "avg_score": 6.82,
  "top_capability": {
    "slug": "best-agent",
    "name": "Best Agent",
    "overall_score": 9.5
  }
}
```

---

## 错误处理

所有错误返回统一格式：

```json
{
  "detail": "错误描述信息"
}
```

常见错误码：

| 状态码 | 说明 |
|--------|------|
| 400 | 请求参数无效 |
| 404 | 资源不存在 |
| 422 | 参数校验失败（FastAPI 自动校验） |
| 503 | 服务依赖不可用（如 OpenAI API Key 未配置） |
