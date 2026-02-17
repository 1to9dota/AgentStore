"""MCP 插件数据源（多个 awesome list + GitHub 搜索 + 官方仓库）"""
import os
import re
import httpx
from .models import CapabilityEntry

# 匹配 GitHub 链接格式的条目
_ENTRY_RE = r"-\s+\[([^\]]+)\]\(https://github\.com/([^/]+)/([^/\s)]+)[^)]*\)\s*(.+)"
_CATEGORY_RE = r"^###?\s+.*?(?:<a[^>]*></a>)?(.+)$"

# 数据源 URL
_AWESOME_URL = "https://raw.githubusercontent.com/punkpeye/awesome-mcp-servers/main/README.md"
_OFFICIAL_URL = "https://raw.githubusercontent.com/modelcontextprotocol/servers/main/README.md"


def parse_awesome_list(md: str, source_tag: str = "mcp") -> list[CapabilityEntry]:
    """解析 awesome-list 格式的 Markdown，提取 GitHub 仓库条目

    Args:
        md: Markdown 原文
        source_tag: 数据源标签，用于区分来源
    """
    entries = []
    seen = set()
    current_category = "other"

    for line in md.splitlines():
        cat_match = re.match(_CATEGORY_RE, line)
        if cat_match:
            raw_cat = cat_match.group(1).strip()
            # 去掉 emoji 和多余空白
            raw_cat = re.sub(r'[^\w\s&/-]', '', raw_cat).strip()
            if raw_cat:
                current_category = raw_cat
            continue

        entry_match = re.match(_ENTRY_RE, line)
        if entry_match:
            name, owner, repo, rest = entry_match.groups()
            # repo 可能带 # 锚点，去掉
            repo = repo.split("#")[0].rstrip("/")
            # 描述在最后一个 " - " 之后（前面是 emoji 标记）
            desc_match = re.search(r'\s-\s(.+)$', rest)
            desc = desc_match.group(1).strip() if desc_match else rest.strip()
            slug = f"mcp-{owner}-{repo}".lower()
            if slug in seen:
                continue
            seen.add(slug)
            entries.append(CapabilityEntry(
                name=name.strip(),
                source=source_tag,
                source_id=f"{owner}/{repo}",
                provider=owner.strip(),
                description=desc.strip(),
                category=current_category,
                repo_url=f"https://github.com/{owner.strip()}/{repo.strip()}",
                protocol="mcp",
            ))
    return entries


async def discover_mcp_plugins(limit: int = 500) -> list[CapabilityEntry]:
    """从 punkpeye/awesome-mcp-servers 获取 MCP 插件列表"""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(_AWESOME_URL)
        resp.raise_for_status()
        entries = parse_awesome_list(resp.text, source_tag="mcp")
        return entries[:limit]


async def discover_mcp_registry(limit: int = 500) -> list[CapabilityEntry]:
    """从官方 modelcontextprotocol/servers 仓库获取 MCP 插件列表

    这是 Anthropic 维护的官方 MCP server 仓库，包含参考实现和社区贡献。
    """
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(_OFFICIAL_URL)
        resp.raise_for_status()
        entries = parse_awesome_list(resp.text, source_tag="mcp-official")
        return entries[:limit]


async def discover_github_search(limit: int = 300) -> list[CapabilityEntry]:
    """用 GitHub Search API 搜索 topic:mcp-server 的仓库

    搜索策略：
    - 使用 topic:mcp-server 精准定位
    - 按 stars 降序排列，优先抓热门项目
    - 每页 100 条，最多翻 3 页（GitHub Search API 限制 1000 条）
    """
    token = os.getenv("GITHUB_TOKEN", "")
    headers = {
        "Accept": "application/vnd.github.v3+json",
    }
    if token:
        headers["Authorization"] = f"token {token}"

    entries: list[CapabilityEntry] = []
    seen = set()
    # 多个搜索关键词组合，尽可能覆盖更多仓库
    queries = [
        "topic:mcp-server",
        "topic:model-context-protocol",
        "mcp-server in:name,description language:TypeScript",
        "mcp-server in:name,description language:Python",
    ]

    async with httpx.AsyncClient(timeout=30) as client:
        for query in queries:
            if len(entries) >= limit:
                break
            # 每个 query 最多翻 2 页
            for page in range(1, 3):
                if len(entries) >= limit:
                    break
                try:
                    resp = await client.get(
                        "https://api.github.com/search/repositories",
                        headers=headers,
                        params={
                            "q": query,
                            "sort": "stars",
                            "order": "desc",
                            "per_page": 100,
                            "page": page,
                        },
                    )
                    if resp.status_code == 403:
                        # rate limit，停止搜索
                        print(f"  GitHub Search API rate limit, 已获取 {len(entries)} 条")
                        break
                    resp.raise_for_status()
                    items = resp.json().get("items", [])
                    if not items:
                        break

                    for item in items:
                        owner = item.get("owner", {}).get("login", "")
                        repo_name = item.get("name", "")
                        slug = f"mcp-{owner}-{repo_name}".lower()
                        if slug in seen:
                            continue
                        seen.add(slug)

                        desc = item.get("description") or ""
                        # 截断过长描述
                        if len(desc) > 300:
                            desc = desc[:297] + "..."

                        entries.append(CapabilityEntry(
                            name=repo_name,
                            source="mcp-github",
                            source_id=f"{owner}/{repo_name}",
                            provider=owner,
                            description=desc,
                            category="other",  # 后续由 AI 分析重新分类
                            repo_url=item.get("html_url", f"https://github.com/{owner}/{repo_name}"),
                            protocol="mcp",
                        ))
                except Exception as e:
                    print(f"  GitHub 搜索异常 (query={query}, page={page}): {e}")
                    break

    print(f"  GitHub Search 发现 {len(entries)} 个仓库")
    return entries[:limit]
