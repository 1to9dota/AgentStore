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
    conn.execute("PRAGMA journal_mode=WAL")  # 并发读写不阻塞
    conn.execute("PRAGMA busy_timeout=5000")  # 锁等待 5 秒
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
    # 用户表
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    # 收藏表
    conn.execute("""
        CREATE TABLE IF NOT EXISTS favorites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            capability_slug TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            UNIQUE(user_id, capability_slug)
        )
    """)
    # 评论表
    conn.execute("""
        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            capability_slug TEXT NOT NULL,
            content TEXT NOT NULL,
            rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    # 插件提交表
    conn.execute("""
        CREATE TABLE IF NOT EXISTS submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            repo_url TEXT NOT NULL,
            description TEXT NOT NULL,
            category TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    # API Key 表
    conn.execute("""
        CREATE TABLE IF NOT EXISTS api_keys (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            key_prefix TEXT NOT NULL,
            key_hash TEXT NOT NULL,
            name TEXT NOT NULL DEFAULT 'default',
            tier TEXT NOT NULL DEFAULT 'free' CHECK(tier IN ('free', 'pro', 'enterprise')),
            is_active BOOLEAN DEFAULT 1,
            daily_limit INTEGER NOT NULL DEFAULT 100,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_used_at TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    # API 使用日志
    conn.execute("""
        CREATE TABLE IF NOT EXISTS usage_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            api_key_id INTEGER,
            user_id INTEGER,
            endpoint TEXT NOT NULL,
            method TEXT NOT NULL DEFAULT 'GET',
            status_code INTEGER,
            response_time_ms INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (api_key_id) REFERENCES api_keys(id)
        )
    """)
    # 评论点赞表
    conn.execute("""
        CREATE TABLE IF NOT EXISTS comment_likes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            comment_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (comment_id) REFERENCES comments(id),
            UNIQUE(user_id, comment_id)
        )
    """)
    # 索引
    conn.execute("CREATE INDEX IF NOT EXISTS idx_usage_logs_key_date ON usage_logs(api_key_id, created_at)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_comment_likes_comment ON comment_likes(comment_id)")

    # 安全添加新列（SQLite 不支持 IF NOT EXISTS 语法）
    _safe_add_columns(conn, "capabilities", [
        ("dependencies", "TEXT DEFAULT '[]'"),
        ("latest_version", "TEXT DEFAULT ''"),
        ("supported_clients", "TEXT DEFAULT '[]'"),
    ])

    conn.commit()
    conn.close()


def _safe_add_columns(conn: sqlite3.Connection, table: str, columns: list[tuple[str, str]]):
    """安全地为表添加新列，已存在则跳过"""
    for col_name, col_def in columns:
        try:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_def}")
        except sqlite3.OperationalError:
            pass  # 列已存在，跳过


# ── Tier 定义 ──────────────────────────────────────────
TIER_LIMITS = {
    "free": 100,       # 100 次/天
    "pro": 10000,      # 10000 次/天
    "enterprise": -1,  # 无限制
}


def log_usage(api_key_id: int | None, user_id: int | None, endpoint: str, method: str, status_code: int, response_time_ms: int):
    """记录 API 调用日志"""
    conn = _get_conn()
    try:
        conn.execute(
            "INSERT INTO usage_logs (api_key_id, user_id, endpoint, method, status_code, response_time_ms) VALUES (?, ?, ?, ?, ?, ?)",
            (api_key_id, user_id, endpoint, method, status_code, response_time_ms),
        )
        # 更新 key 的最后使用时间
        if api_key_id:
            conn.execute(
                "UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?",
                (api_key_id,),
            )
        conn.commit()
    finally:
        conn.close()


def get_usage_stats(api_key_id: int) -> dict:
    """获取某个 API Key 的使用统计：今日调用、剩余次数、最近 7 天每天调用"""
    conn = _get_conn()
    try:
        # 获取 key 的 daily_limit
        key_row = conn.execute(
            "SELECT daily_limit FROM api_keys WHERE id = ?", (api_key_id,)
        ).fetchone()
        daily_limit = key_row["daily_limit"] if key_row else 100

        # 今日调用次数
        today_count = conn.execute(
            "SELECT COUNT(*) FROM usage_logs WHERE api_key_id = ? AND date(created_at) = date('now')",
            (api_key_id,),
        ).fetchone()[0]

        # 今日剩余次数（-1 表示无限制）
        today_remaining = -1 if daily_limit == -1 else max(0, daily_limit - today_count)

        # 最近 7 天每天的调用次数
        daily_rows = conn.execute(
            """SELECT date(created_at) as day, COUNT(*) as cnt
               FROM usage_logs
               WHERE api_key_id = ? AND created_at >= datetime('now', '-7 days')
               GROUP BY date(created_at)
               ORDER BY day DESC""",
            (api_key_id,),
        ).fetchall()
        daily = {r["day"]: r["cnt"] for r in daily_rows}
    finally:
        conn.close()

    return {
        "today_count": today_count,
        "today_remaining": today_remaining,
        "daily_limit": daily_limit,
        "last_7_days": daily,
    }


def get_api_key_by_hash(key_hash_value: str) -> dict | None:
    """通过 key_hash 查找 API Key 记录"""
    conn = _get_conn()
    try:
        row = conn.execute(
            "SELECT * FROM api_keys WHERE key_hash = ? AND is_active = 1",
            (key_hash_value,),
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_today_usage_count(api_key_id: int) -> int:
    """获取某个 key 今日调用次数"""
    conn = _get_conn()
    try:
        count = conn.execute(
            "SELECT COUNT(*) FROM usage_logs WHERE api_key_id = ? AND date(created_at) = date('now')",
            (api_key_id,),
        ).fetchone()[0]
    finally:
        conn.close()
    return count


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
                 dependencies, latest_version, supported_clients,
                 ai_summary, one_liner, install_guide, usage_guide, safety_notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                json.dumps(item.get("dependencies", []), ensure_ascii=False),
                item.get("latest_version", ""),
                json.dumps(item.get("supported_clients", []), ensure_ascii=False),
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
    # 反序列化 JSON 字符串为 list
    for key in ("dependencies", "supported_clients"):
        val = d.get(key)
        if isinstance(val, str):
            try:
                d[key] = json.loads(val)
            except (json.JSONDecodeError, TypeError):
                d[key] = []
        elif val is None:
            d[key] = []
    # latest_version 保证有默认值
    if d.get("latest_version") is None:
        d["latest_version"] = ""
    return d
