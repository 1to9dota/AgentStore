"""额外数据源：GitHub Topics 搜索 + npm 包搜索

补充 discover_mcp.py 覆盖不到的 MCP 插件。
"""
import asyncio
import os
import httpx
from .models import CapabilityEntry


async def discover_github_topics(limit: int = 200) -> list[CapabilityEntry]:
    """通过 GitHub Topics API 搜索 mcp 相关仓库

    与 discover_mcp.discover_github_search() 互补：
    - 这里用 topic 维度搜索，覆盖 mcp、mcp-plugin、mcp-tool 等标签
    - 按最近更新排序，抓活跃项目
    """
    token = os.getenv("GITHUB_TOKEN", "")
    headers = {
        "Accept": "application/vnd.github.v3+json",
    }
    if token:
        headers["Authorization"] = f"token {token}"

    entries: list[CapabilityEntry] = []
    seen = set()

    # 补充搜索：用不同的关键词组合覆盖更多仓库
    queries = [
        "topic:mcp-plugin",
        "topic:mcp-tool",
        "topic:mcp stars:>5",
        "mcp server in:readme language:TypeScript stars:>10",
        "mcp server in:readme language:Python stars:>10",
    ]

    async with httpx.AsyncClient(timeout=30) as client:
        for query in queries:
            if len(entries) >= limit:
                break
            try:
                resp = await client.get(
                    "https://api.github.com/search/repositories",
                    headers=headers,
                    params={
                        "q": query,
                        "sort": "updated",
                        "order": "desc",
                        "per_page": 100,
                        "page": 1,
                    },
                )
                if resp.status_code == 403:
                    print(f"  GitHub Topics API rate limit, 已获取 {len(entries)} 条")
                    break
                resp.raise_for_status()
                items = resp.json().get("items", [])

                for item in items:
                    owner = item.get("owner", {}).get("login", "")
                    repo_name = item.get("name", "")
                    slug = f"mcp-{owner}-{repo_name}".lower()
                    if slug in seen:
                        continue
                    seen.add(slug)

                    desc = item.get("description") or ""
                    if len(desc) > 300:
                        desc = desc[:297] + "..."

                    entries.append(CapabilityEntry(
                        name=repo_name,
                        source="mcp-topics",
                        source_id=f"{owner}/{repo_name}",
                        provider=owner,
                        description=desc,
                        category="other",
                        repo_url=item.get("html_url", f"https://github.com/{owner}/{repo_name}"),
                        protocol="mcp",
                    ))
            except Exception as e:
                print(f"  GitHub Topics 搜索异常 (query={query}): {e}")
                continue
            # 请求间隔，避免触发 GitHub abuse detection
            await asyncio.sleep(2)

    print(f"  GitHub Topics 发现 {len(entries)} 个仓库")
    return entries[:limit]


async def discover_npm_mcp(limit: int = 200) -> list[CapabilityEntry]:
    """从 npm registry 搜索 mcp-server 相关包

    npm 上有很多 MCP server 以 npm 包形式发布，
    这些可能没有在 awesome list 中收录。
    """
    entries: list[CapabilityEntry] = []
    seen = set()

    # npm 搜索关键词
    search_terms = ["mcp-server", "mcp-plugin", "model-context-protocol"]

    async with httpx.AsyncClient(timeout=30) as client:
        for term in search_terms:
            if len(entries) >= limit:
                break
            try:
                # npm search API（registry.npmjs.org）
                resp = await client.get(
                    "https://registry.npmjs.org/-/v1/search",
                    params={
                        "text": term,
                        "size": 100,  # 每次最多 100 条
                    },
                )
                resp.raise_for_status()
                results = resp.json().get("objects", [])

                for obj in results:
                    pkg = obj.get("package", {})
                    name = pkg.get("name", "")
                    if not name:
                        continue

                    # 尝试提取 GitHub 仓库地址
                    repo_url = None
                    links = pkg.get("links", {})
                    repo_raw = links.get("repository", "") or ""
                    if "github.com" in repo_raw:
                        repo_url = repo_raw.rstrip("/").removesuffix(".git")

                    # 用 npm 包名生成 slug，避免和 GitHub 来源冲突
                    slug_name = name.replace("/", "-").replace("@", "")
                    slug = f"mcp-npm-{slug_name}".lower()
                    if slug in seen:
                        continue
                    seen.add(slug)

                    # 如果有 GitHub 仓库，用 GitHub owner/repo 作为 source_id
                    if repo_url:
                        # 从 URL 提取 owner/repo
                        parts = repo_url.rstrip("/").split("/")
                        if len(parts) >= 2:
                            source_id = f"{parts[-2]}/{parts[-1]}"
                        else:
                            source_id = name
                    else:
                        source_id = name

                    publisher = pkg.get("publisher", {}).get("username", "")
                    desc = pkg.get("description", "")
                    if len(desc) > 300:
                        desc = desc[:297] + "..."

                    entries.append(CapabilityEntry(
                        name=name,
                        source="mcp-npm",
                        source_id=source_id,
                        provider=publisher or "npm",
                        description=desc,
                        category="other",
                        repo_url=repo_url,
                        protocol="mcp",
                    ))
            except Exception as e:
                print(f"  npm 搜索异常 (term={term}): {e}")
                continue

    print(f"  npm 搜索发现 {len(entries)} 个包")
    return entries[:limit]
