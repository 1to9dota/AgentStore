"""SQLite 数据库层"""
import json
import os
import sqlite3
from pathlib import Path


def _get_db_path() -> str:
    return os.getenv("DATABASE_PATH", str(Path(__file__).parent.parent / "data" / "agentstore.db"))


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(_get_db_path())
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = _get_conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS capabilities (
            slug TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            source TEXT NOT NULL,
            source_id TEXT NOT NULL,
            provider TEXT NOT NULL,
            description TEXT,
            category TEXT,
            repo_url TEXT,
            endpoint TEXT,
            protocol TEXT DEFAULT 'rest',
            stars INTEGER DEFAULT 0,
            forks INTEGER DEFAULT 0,
            language TEXT,
            last_updated TEXT,
            contributors INTEGER DEFAULT 0,
            has_tests BOOLEAN DEFAULT 0,
            has_typescript BOOLEAN DEFAULT 0,
            readme_length INTEGER DEFAULT 0,
            reliability REAL DEFAULT 0,
            safety REAL DEFAULT 0,
            capability REAL DEFAULT 0,
            reputation REAL DEFAULT 0,
            usability REAL DEFAULT 0,
            overall_score REAL DEFAULT 0,
            ai_summary TEXT,
            one_liner TEXT,
            install_guide TEXT,
            usage_guide TEXT,
            safety_notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()


def insert_capabilities(items: list[dict]):
    conn = _get_conn()
    try:
        for item in items:
            scores = item.get("scores", {})
            conn.execute("""
                INSERT OR REPLACE INTO capabilities
                (slug, name, source, source_id, provider, description, category,
                 repo_url, endpoint, protocol, stars, forks, language, last_updated,
                 contributors, has_tests, has_typescript, readme_length,
                 reliability, safety, capability, reputation, usability, overall_score,
                 ai_summary, one_liner, install_guide, usage_guide, safety_notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                item["slug"], item["name"], item["source"], item["source_id"],
                item["provider"], item.get("description", ""), item.get("category", ""),
                item.get("repo_url"), item.get("endpoint"), item.get("protocol", "rest"),
                item.get("stars", 0), item.get("forks", 0), item.get("language"),
                item.get("last_updated"), item.get("contributors", 0),
                item.get("has_tests", False), item.get("has_typescript", False),
                item.get("readme_length", 0),
                scores.get("reliability", 0), scores.get("safety", 0),
                scores.get("capability", 0), scores.get("reputation", 0),
                scores.get("usability", 0), item.get("overall_score", 0),
                item.get("ai_summary", ""), item.get("one_liner", ""),
                item.get("install_guide", ""), item.get("usage_guide", ""),
                item.get("safety_notes", ""),
            ))
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def search_capabilities(
    q: str = "",
    category: str = "",
    limit: int = 20,
    sort_by: str = "overall_score",
    order: str = "desc",
    page: int = 1,
    per_page: int | None = None,
) -> dict:
    """搜索能力，支持排序、分页、模糊搜索。

    返回 {"items": [...], "total": N}
    """
    conn = _get_conn()
    conditions = []
    params: list = []
    if q:
        conditions.append("(name LIKE ? OR description LIKE ? OR provider LIKE ?)")
        params.extend([f"%{q}%", f"%{q}%", f"%{q}%"])
    if category:
        conditions.append("category = ?")
        params.append(category)
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    # 计算总数
    total = conn.execute(
        f"SELECT COUNT(*) FROM capabilities {where}", params
    ).fetchone()[0]

    # 排序（白名单防注入）
    allowed_sort = {"overall_score", "stars", "last_updated", "name", "created_at"}
    if sort_by not in allowed_sort:
        sort_by = "overall_score"
    order_dir = "ASC" if order.lower() == "asc" else "DESC"

    # 分页
    if per_page is not None:
        actual_limit = per_page
        offset = (max(page, 1) - 1) * per_page
    else:
        actual_limit = limit
        offset = 0

    rows = conn.execute(
        f"SELECT * FROM capabilities {where} ORDER BY {sort_by} {order_dir} LIMIT ? OFFSET ?",
        params + [actual_limit, offset]
    ).fetchall()
    conn.close()
    return {"items": [_row_to_dict(r) for r in rows], "total": total}


def get_stats() -> dict:
    """返回统计信息：总数、各分类数量、平均分、最高分能力。"""
    conn = _get_conn()
    total = conn.execute("SELECT COUNT(*) FROM capabilities").fetchone()[0]

    # 各分类数量
    cat_rows = conn.execute(
        "SELECT category, COUNT(*) as cnt FROM capabilities WHERE category != '' GROUP BY category ORDER BY cnt DESC"
    ).fetchall()
    categories = {r["category"]: r["cnt"] for r in cat_rows}

    # 平均分
    avg_row = conn.execute("SELECT AVG(overall_score) as avg_score FROM capabilities").fetchone()
    avg_score = round(avg_row["avg_score"] or 0, 2)

    # 最高分能力
    top_row = conn.execute(
        "SELECT * FROM capabilities ORDER BY overall_score DESC LIMIT 1"
    ).fetchone()
    top_capability = _row_to_dict(top_row) if top_row else None

    conn.close()
    return {
        "total": total,
        "categories": categories,
        "avg_score": avg_score,
        "top_capability": top_capability,
    }


def get_capability(slug: str) -> dict | None:
    conn = _get_conn()
    row = conn.execute("SELECT * FROM capabilities WHERE slug = ?", (slug,)).fetchone()
    conn.close()
    return _row_to_dict(row) if row else None


def get_categories() -> list[str]:
    conn = _get_conn()
    rows = conn.execute("SELECT DISTINCT category FROM capabilities ORDER BY category").fetchall()
    conn.close()
    return [r["category"] for r in rows if r["category"]]


def _row_to_dict(row: sqlite3.Row) -> dict:
    d = dict(row)
    d["scores"] = {
        "reliability": d.pop("reliability", 0),
        "safety": d.pop("safety", 0),
        "capability": d.pop("capability", 0),
        "reputation": d.pop("reputation", 0),
        "usability": d.pop("usability", 0),
    }
    return d
