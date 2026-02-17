"""OpenClaw ClawHub 数据采集"""
import httpx
from .models import CapabilityEntry


def parse_clawhub_response(raw: dict) -> list[CapabilityEntry]:
    entries = []
    for skill in raw.get("skills", []):
        try:
            entry = CapabilityEntry(
                name=skill["name"],
                source="openclaw",
                source_id=skill["id"],
                provider=skill.get("author", "unknown"),
                description=skill.get("description", ""),
                category=skill.get("category", "other"),
                repo_url=skill.get("repo_url"),
                protocol="openclaw",
            )
            entries.append(entry)
        except (KeyError, TypeError):
            continue
    return entries


async def discover_openclaw_skills(
    api_url: str = "https://hub.openclaw.ai/api",
    limit: int = 200,
) -> list[CapabilityEntry]:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(f"{api_url}/skills", params={"limit": limit, "sort": "installs"})
        resp.raise_for_status()
        return parse_clawhub_response(resp.json())
