"""AgentStore REST API"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .database import search_capabilities, get_capability, get_categories, init_db

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
def api_search(q: str = "", category: str = "", limit: int = 20):
    results = search_capabilities(q=q, category=category, limit=limit)
    return {"results": results, "total": len(results)}


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
def api_rankings(category: str = "", sort: str = "overall_score", limit: int = 50):
    results = search_capabilities(category=category, limit=limit)
    return {"results": results, "total": len(results)}
