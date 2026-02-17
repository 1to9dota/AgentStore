"""AgentStore REST API"""
import math
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from .database import search_capabilities, get_capability, get_categories, get_stats, init_db

app = FastAPI(
    title="AgentStore API",
    description="Agent 能力注册表 + 信誉系统",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()


@app.get("/api/v1/search")
def api_search(
    q: str = "",
    category: str = "",
    sort: str = "overall_score",
    order: str = "desc",
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=200),
):
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


@app.get("/api/v1/capabilities/{slug}")
def api_get_capability(slug: str):
    cap = get_capability(slug)
    if not cap:
        raise HTTPException(status_code=404, detail="Capability not found")
    return cap


@app.get("/api/v1/capabilities/{slug}/scores")
def api_get_scores(slug: str):
    cap = get_capability(slug)
    if not cap:
        raise HTTPException(status_code=404, detail="Capability not found")
    return {"slug": slug, "scores": cap["scores"], "overall_score": cap["overall_score"]}


@app.get("/api/v1/categories")
def api_categories():
    return {"categories": get_categories()}


@app.get("/api/v1/rankings")
def api_rankings(category: str = "", sort: str = "overall_score", order: str = "desc", limit: int = Query(default=50, ge=1, le=200)):
    data = search_capabilities(category=category, sort_by=sort, order=order, limit=limit)
    return {"results": data["items"], "total": data["total"]}


@app.get("/api/v1/stats")
def api_stats():
    return get_stats()
