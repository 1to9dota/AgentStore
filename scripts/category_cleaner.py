"""分类名清洗和标准化"""

# 标准分类列表（和前端 types.ts 里的 CATEGORIES 对齐）
STANDARD_CATEGORIES = {
    "development": "Development",
    "data": "Data & Database",
    "web": "Web & Search",
    "productivity": "Productivity",
    "ai": "AI & LLM",
    "media": "Design & Media",
    "trading": "Trading & Finance",
    "communication": "Communication",
}

# 分类映射表：把各种异常分类名映射到标准分类
CATEGORY_MAPPING = {
    # 健康/医疗 → 数据分析（健康数据处理类）
    "health": "data",
    "healthcare": "data",
    # 云存储 → 数据
    "cloud storage": "data",
    # 视频 → 媒体
    "video": "media",
    # 解析错误的分类名
    "a nameart-and-culture/aart & culture": "media",
    # 自动化 → 效率工具
    "automation": "productivity",
}

# 关键词模糊匹配规则：(关键词列表, 目标分类)
_KEYWORD_RULES = [
    (["art", "music", "video", "image", "design", "photo", "media", "creative"], "media"),
    (["trade", "finance", "crypto", "bitcoin", "exchange", "payment", "money"], "trading"),
    (["chat", "email", "message", "social", "slack", "discord", "telegram"], "communication"),
    (["search", "browser", "scrape", "crawl", "http", "url", "web"], "web"),
    (["database", "sql", "storage", "analytics", "data"], "data"),
    (["llm", "machine learning", "neural", "gpt", "openai", "anthropic"], "ai"),
    (["calendar", "todo", "note", "task", "workflow", "automat"], "productivity"),
    (["code", "dev", "git", "docker", "deploy", "ci", "test"], "development"),
]


def clean_category(raw: str) -> str:
    """清洗分类名，返回标准分类。

    策略：
    1. 先转小写，去空白
    2. 如果已经是标准分类，直接返回
    3. 查 CATEGORY_MAPPING 精确匹配
    4. 关键词模糊匹配
    5. 兜底到 "development"
    """
    normalized = raw.strip().lower()

    # 已经是标准分类
    if normalized in STANDARD_CATEGORIES:
        return normalized

    # 精确映射
    if normalized in CATEGORY_MAPPING:
        return CATEGORY_MAPPING[normalized]

    # 关键词模糊匹配
    for keywords, target in _KEYWORD_RULES:
        for kw in keywords:
            if kw in normalized:
                return target

    # 兜底
    return "development"
