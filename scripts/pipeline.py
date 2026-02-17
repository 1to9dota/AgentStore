"""AgentStore 数据管线

流程: discover → collect → analyze → score → output
"""
import asyncio
import json
import os
from pathlib import Path
from dotenv import load_dotenv
from .models import CapabilityEntry, CapabilityData, RepoData, AnalysisResult, Scores
from .discover_openclaw import discover_openclaw_skills
from .discover_mcp import discover_mcp_plugins
from .collect import collect_repo_data
from .ai_analyzer import create_analyzer
from .score import calculate_scores

load_dotenv()


def assemble_output(
    entry: CapabilityEntry,
    repo: RepoData,
    analysis: AnalysisResult,
    scores: Scores,
) -> dict:
    return {
        "slug": entry.slug,
        "name": entry.name,
        "source": entry.source,
        "source_id": entry.source_id,
        "provider": entry.provider,
        "description": entry.description,
        "category": analysis.category_suggestion or entry.category,
        "repo_url": entry.repo_url,
        "endpoint": entry.endpoint,
        "protocol": entry.protocol,
        "stars": repo.stars,
        "forks": repo.forks,
        "language": repo.language,
        "last_updated": repo.last_updated,
        "contributors": repo.contributors,
        "has_tests": repo.has_tests,
        "has_typescript": repo.has_typescript,
        "readme_length": repo.readme_length,
        "scores": {
            "reliability": scores.reliability,
            "safety": scores.safety,
            "capability": scores.capability,
            "reputation": scores.reputation,
            "usability": scores.usability,
        },
        "overall_score": scores.overall,
        "ai_summary": analysis.summary,
        "one_liner": analysis.one_liner,
        "install_guide": analysis.install_guide,
        "usage_guide": analysis.usage_guide,
        "safety_notes": analysis.safety_notes,
    }


async def run_pipeline(
    openclaw_limit: int = 100,
    mcp_limit: int = 200,
    force: bool = False,
) -> list[dict]:
    token = os.getenv("GITHUB_TOKEN", "")
    provider = os.getenv("AI_PROVIDER", "openai")

    # 读取已有数据，用于增量更新
    existing_data: list[dict] = []
    existing_slugs: set[str] = set()
    out_dir = Path(__file__).parent.parent / "data"
    out_file = out_dir / "capabilities.json"
    if not force and out_file.exists():
        try:
            existing_data = json.loads(out_file.read_text())
            existing_slugs = {item["slug"] for item in existing_data if "slug" in item}
        except (json.JSONDecodeError, KeyError):
            existing_data = []
            existing_slugs = set()

    print("[1/5] 发现 Agent 能力...")
    openclaw_entries: list[CapabilityEntry] = []
    mcp_entries: list[CapabilityEntry] = []
    if openclaw_limit > 0 and mcp_limit > 0:
        openclaw_entries, mcp_entries = await asyncio.gather(
            discover_openclaw_skills(limit=openclaw_limit),
            discover_mcp_plugins(limit=mcp_limit),
        )
    elif openclaw_limit > 0:
        openclaw_entries = await discover_openclaw_skills(limit=openclaw_limit)
    elif mcp_limit > 0:
        mcp_entries = await discover_mcp_plugins(limit=mcp_limit)
    all_entries = openclaw_entries + mcp_entries
    print(f"  发现 {len(openclaw_entries)} 个 OpenClaw skills + {len(mcp_entries)} 个 MCP plugins")

    # 增量更新：过滤已存在的条目
    if not force and existing_slugs:
        new_entries = [e for e in all_entries if e.slug not in existing_slugs]
        skipped = len(all_entries) - len(new_entries)
        print(f"  跳过 {skipped} 个已有能力，新增 {len(new_entries)} 个")
        all_entries = new_entries

    print("[2/5] 采集 GitHub 数据...")
    all_repos = await collect_repo_data(all_entries, token=token)

    print(f"[3/5] AI 分析（{provider}）...")
    analyzer_kwargs = {}
    if provider == "openai":
        analyzer_kwargs["api_key"] = os.getenv("OPENAI_API_KEY", "")
    elif provider == "anthropic":
        analyzer_kwargs["api_key"] = os.getenv("ANTHROPIC_API_KEY", "")
    elif provider == "gemini":
        analyzer_kwargs["api_key"] = os.getenv("GEMINI_API_KEY", "")
    elif provider == "ollama":
        analyzer_kwargs["model"] = os.getenv("OLLAMA_MODEL", "llama3")

    analyzer = create_analyzer(provider=provider, **analyzer_kwargs)
    sem = asyncio.Semaphore(5)

    async def _analyze_one(entry: CapabilityEntry, repo: RepoData) -> AnalysisResult:
        async with sem:
            try:
                return await analyzer.analyze(entry.name, repo.readme_text, entry.description)
            except Exception as e:
                print(f"  AI 分析失败: {entry.name} - {e}")
                return AnalysisResult()

    all_analyses = await asyncio.gather(
        *[_analyze_one(e, r) for e, r in zip(all_entries, all_repos)]
    )

    print("[4/5] 计算评分...")
    data_list = [
        CapabilityData(entry=e, repo=r, analysis=a)
        for e, r, a in zip(all_entries, all_repos, all_analyses)
    ]
    all_scores = calculate_scores(data_list)

    print("[5/5] 生成输出...")
    new_results = [
        assemble_output(e, r, a, s)
        for e, r, a, s in zip(all_entries, all_repos, all_analyses, all_scores)
    ]

    # 合并已有数据和新数据
    if not force and existing_data:
        # 用新结果的 slug 集合，避免重复
        new_slugs = {item["slug"] for item in new_results}
        merged = [item for item in existing_data if item["slug"] not in new_slugs]
        merged.extend(new_results)
        results = merged
    else:
        results = new_results

    results.sort(key=lambda x: x["overall_score"], reverse=True)

    out_dir.mkdir(exist_ok=True)
    out_file.write_text(json.dumps(results, ensure_ascii=False, indent=2))

    web_data = Path(__file__).parent.parent / "web" / "data"
    web_data.mkdir(parents=True, exist_ok=True)
    (web_data / "capabilities.json").write_text(json.dumps(results, ensure_ascii=False, indent=2))

    print(f"完成！共 {len(results)} 个能力，已输出到 {out_file}")
    return results


if __name__ == "__main__":
    asyncio.run(run_pipeline())
