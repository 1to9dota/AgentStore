"""AgentStore REST API — Agent 能力注册表 + 信誉系统"""
import math
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from .database import search_capabilities, get_capability, get_categories, get_stats, init_db
from .users import router as users_router
from .schemas import (
    SearchResponse,
    CapabilityResponse,
    ScoresResponse,
    CategoriesResponse,
    RankingsResponse,
    SemanticSearchResponse,
    StatsResponse,
    ErrorResponse,
)

# ── FastAPI 应用初始化 ────────────────────────────────────────

app = FastAPI(
    title="AgentStore API",
    version="0.1.0",
    description="""
# AgentStore — Agent 能力注册表 + 信誉系统

AgentStore 为 AI Agent 生态提供统一的能力发现与信誉评估服务。

## 核心功能

- **能力搜索** — 关键词搜索 + 语义搜索，快速找到需要的 Agent 能力
- **五维评分** — 可靠性 / 安全性 / 能力 / 声誉 / 易用性，全方位评估
- **分类浏览** — 按领域分类浏览所有已注册能力
- **排行榜** — 按评分、Star 数等维度排行

## 快速开始

```bash
# 搜索能力
curl https://your-domain/api/v1/search?q=mcp

# 获取能力详情
curl https://your-domain/api/v1/capabilities/your-slug

# 查看排行榜
curl https://your-domain/api/v1/rankings?limit=10
```

## 数据格式

所有端点返回 JSON，日期使用 ISO 8601 格式，评分范围 0-10。
""",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/api/v1/openapi.json",
    openapi_tags=[
        {"name": "搜索", "description": "关键词搜索 Agent 能力"},
        {"name": "能力详情", "description": "获取单个能力的完整信息和评分"},
        {"name": "分类", "description": "浏览能力分类"},
        {"name": "排行榜", "description": "按各维度排行"},
        {"name": "统计", "description": "平台整体统计数据"},
        {"name": "语义搜索", "description": "基于 OpenAI Embedding 的语义理解搜索"},
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(users_router)


@app.on_event("startup")
def startup():
    init_db()


# ── 搜索 ─────────────────────────────────────────────────────

@app.get(
    "/api/v1/search",
    response_model=SearchResponse,
    summary="搜索 Agent 能力",
    description="根据关键词搜索能力，支持按分类筛选、多维度排序和分页。"
    "关键词会匹配名称、描述和提供者字段。",
    response_description="分页搜索结果，包含匹配项列表和分页信息",
    tags=["搜索"],
    responses={
        200: {"description": "搜索成功，返回匹配结果"},
    },
)
def api_search(
    q: str = Query(default="", description="搜索关键词，留空返回全部"),
    category: str = Query(default="", description="按分类筛选，如 'coding', 'data'"),
    sort: str = Query(default="overall_score", description="排序字段：overall_score / stars / last_updated / name / created_at"),
    order: str = Query(default="desc", description="排序方向：asc / desc"),
    page: int = Query(default=1, ge=1, description="页码，从 1 开始"),
    per_page: int = Query(default=20, ge=1, le=200, description="每页数量，1-200"),
):
    """搜索 Agent 能力，支持关键词匹配、分类筛选、排序和分页。"""
    data = search_capabilities(
        q=q, category=category, sort_by=sort, order=order, page=page, per_page=per_page
    )
    total_pages = math.ceil(data["total"] / per_page) if per_page > 0 else 1
    return {
        "results": data["items"],
        "total": data["total"],
        "page": page,
        "per_page": per_page,
        "total_pages": total_pages,
    }


# ── 能力详情 ──────────────────────────────────────────────────

@app.get(
    "/api/v1/capabilities/{slug}",
    response_model=CapabilityResponse,
    summary="获取能力详情",
    description="根据 slug 获取单个 Agent 能力的完整信息，包括描述、评分、安装指南等。",
    response_description="能力的完整数据，包含五维评分和 AI 生成的使用指南",
    tags=["能力详情"],
    responses={
        200: {"description": "成功返回能力详情"},
        404: {"description": "能力不存在", "model": ErrorResponse},
    },
)
def api_get_capability(slug: str):
    """根据 slug 获取单个能力的完整详情。"""
    cap = get_capability(slug)
    if not cap:
        raise HTTPException(status_code=404, detail="Capability not found")
    return cap


@app.get(
    "/api/v1/capabilities/{slug}/scores",
    response_model=ScoresResponse,
    summary="获取能力评分",
    description="获取指定能力的五维评分详情和综合分，适合只需要评分数据的场景。",
    response_description="五维评分和综合分",
    tags=["能力详情"],
    responses={
        200: {"description": "成功返回评分数据"},
        404: {"description": "能力不存在", "model": ErrorResponse},
    },
)
def api_get_scores(slug: str):
    """获取指定能力的五维评分和综合分。"""
    cap = get_capability(slug)
    if not cap:
        raise HTTPException(status_code=404, detail="Capability not found")
    return {"slug": slug, "scores": cap["scores"], "overall_score": cap["overall_score"]}


# ── 分类 ─────────────────────────────────────────────────────

@app.get(
    "/api/v1/categories",
    response_model=CategoriesResponse,
    summary="获取所有分类",
    description="返回平台中所有已有的能力分类列表，按字母顺序排列。",
    response_description="分类名称列表",
    tags=["分类"],
    responses={
        200: {"description": "成功返回分类列表"},
    },
)
def api_categories():
    """获取所有能力分类。"""
    return {"categories": get_categories()}


# ── 排行榜 ────────────────────────────────────────────────────

@app.get(
    "/api/v1/rankings",
    response_model=RankingsResponse,
    summary="能力排行榜",
    description="按指定维度返回排行榜，支持按分类筛选和自定义排序。"
    "默认按综合评分降序排列。",
    response_description="排行榜列表和匹配总数",
    tags=["排行榜"],
    responses={
        200: {"description": "成功返回排行榜数据"},
    },
)
def api_rankings(
    category: str = Query(default="", description="按分类筛选，留空返回所有分类"),
    sort: str = Query(default="overall_score", description="排序字段：overall_score / stars / last_updated / name / created_at"),
    order: str = Query(default="desc", description="排序方向：asc / desc"),
    limit: int = Query(default=50, ge=1, le=200, description="返回数量上限，1-200"),
):
    """获取能力排行榜。"""
    data = search_capabilities(category=category, sort_by=sort, order=order, limit=limit)
    return {"results": data["items"], "total": data["total"]}


# ── 语义搜索 ──────────────────────────────────────────────────

@app.get(
    "/api/v1/semantic-search",
    response_model=SemanticSearchResponse,
    summary="语义搜索",
    description="基于 OpenAI Embedding 的语义搜索，能理解查询意图而非简单关键词匹配。"
    "例如搜索 '帮我处理 PDF 文件' 能匹配到 PDF 相关能力。"
    "需要服务端配置 OPENAI_API_KEY 环境变量。",
    response_description="按语义相似度降序排列的搜索结果",
    tags=["语义搜索"],
    responses={
        200: {"description": "搜索成功"},
        503: {"description": "OpenAI API Key 未配置", "model": ErrorResponse},
    },
)
def api_semantic_search(
    q: str = Query(..., description="自然语言查询，如 '帮我分析代码质量'"),
    limit: int = Query(default=10, ge=1, le=50, description="返回数量上限，1-50"),
):
    """语义搜索 — 用 embedding 理解查询意图"""
    import os
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=503, detail="OpenAI API key not configured")

    from scripts.embeddings import search_similar
    results = search_similar(q, api_key, top_k=limit)

    # 查数据库获取完整信息
    capabilities = []
    for slug, score in results:
        cap = get_capability(slug)
        if cap:
            cap["similarity"] = round(score, 4)
            capabilities.append(cap)

    return {"results": capabilities, "total": len(capabilities), "query": q}


# ── 统计 ─────────────────────────────────────────────────────

@app.get(
    "/api/v1/stats",
    response_model=StatsResponse,
    summary="平台统计",
    description="返回平台整体统计数据，包括能力总数、各分类数量、平均分和最高分能力。",
    response_description="平台统计概览",
    tags=["统计"],
    responses={
        200: {"description": "成功返回统计数据"},
    },
)
def api_stats():
    """获取平台整体统计信息。"""
    return get_stats()
