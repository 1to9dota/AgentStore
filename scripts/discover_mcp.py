"""MCP 插件数据源（移植自 AgentRating discover.py）"""
import re
import httpx
from .models import CapabilityEntry

_ENTRY_RE = r"-\s+\[([^\]]+)\]\(https://github\.com/([^/]+)/([^/)]+)\)\s*[^-]*-\s*(.*)"
_CATEGORY_RE = r"^##\s+(.+)$"
_AWESOME_URL = "https://raw.githubusercontent.com/punkpeye/awesome-mcp-servers/main/README.md"


def parse_awesome_list(md: str) -> list[CapabilityEntry]:
    entries = []
    seen = set()
    current_category = "other"

    for line in md.splitlines():
        cat_match = re.match(_CATEGORY_RE, line)
        if cat_match:
            current_category = cat_match.group(1).strip()
            continue

        entry_match = re.match(_ENTRY_RE, line)
        if entry_match:
            name, owner, repo, desc = entry_match.groups()
            slug = f"mcp-{owner}-{repo}".lower()
            if slug in seen:
                continue
            seen.add(slug)
            entries.append(CapabilityEntry(
                name=name.strip(),
                source="mcp",
                source_id=f"{owner}/{repo}",
                provider=owner.strip(),
                description=desc.strip(),
                category=current_category,
                repo_url=f"https://github.com/{owner.strip()}/{repo.strip()}",
                protocol="mcp",
            ))
    return entries


async def discover_mcp_plugins(limit: int = 200) -> list[CapabilityEntry]:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(_AWESOME_URL)
        resp.raise_for_status()
        entries = parse_awesome_list(resp.text)
        return entries[:limit]
