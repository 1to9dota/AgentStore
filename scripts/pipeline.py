"""AgentStore 数据管线

流程: discover → collect → scan → analyze → score → output
"""
import asyncio
import json
import os
import shutil
import tempfile
from pathlib import Path
from dotenv import load_dotenv
from .models import CapabilityEntry, CapabilityData, RepoData, AnalysisResult, Scores, ScanResult
from .discover_openclaw import discover_openclaw_skills
from .discover_mcp import discover_mcp_plugins
from .collect import collect_repo_data
from .ai_analyzer import create_analyzer
from .score import calculate_scores
from .category_cleaner import clean_category
from .scanner import run_all_scanners

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
        "category": clean_category(analysis.category_suggestion or entry.category),
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


async def _scan_all_repos(entries: list[CapabilityEntry]) -> list[ScanResult]:
    """对所有有 repo_url 的条目执行安全扫描

    - 浅克隆仓库到临时目录
    - 用 Semaphore 控制最多 3 个并发克隆
    - 扫描完成后删除临时目录
    """
    clone_sem = asyncio.Semaphore(3)
    scan_base = Path(tempfile.gettempdir()) / "agentstore-scan"
    scan_base.mkdir(exist_ok=True)

    async def _scan_one(entry: CapabilityEntry) -> ScanResult:
        if not entry.repo_url:
            return ScanResult(details="无仓库地址，跳过扫描")

        repo_dir = scan_base / entry.slug
        async with clone_sem:
            # 浅克隆
            try:
                proc = await asyncio.create_subprocess_exec(
                    "git", "clone", "--depth", "1", "--quiet",
                    entry.repo_url, str(repo_dir),
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                _, stderr = await asyncio.wait_for(proc.communicate(), timeout=60)
                if proc.returncode != 0:
                    return ScanResult(
                        details=f"克隆失败: {stderr.decode(errors='ignore')[:200]}"
                    )
            except asyncio.TimeoutError:
                return ScanResult(details="克隆超时")
            except Exception as e:
                return ScanResult(details=f"克隆异常: {e}")

            # 扫描
            try:
                result = await run_all_scanners(str(repo_dir))
            except Exception as e:
                result = ScanResult(details=f"扫描异常: {e}")

            # 清理
            try:
                shutil.rmtree(repo_dir, ignore_errors=True)
            except Exception:
                pass

            return result

    results = await asyncio.gather(
        *[_scan_one(e) for e in entries],
        return_exceptions=True,
    )

    # 将异常转换为空 ScanResult
    final: list[ScanResult] = []
    for r in results:
        if isinstance(r, ScanResult):
            final.append(r)
        else:
            final.append(ScanResult(details=f"扫描任务异常: {r}"))

    scanned = sum(1 for r in final if r.tool)
    print(f"  扫描完成：{scanned}/{len(entries)} 个仓库")
    return final


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

    print("[1/6] 发现 Agent 能力...")
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

    print("[2/6] 采集 GitHub 数据...")
    all_repos = await collect_repo_data(all_entries, token=token)

    print("[3/6] 安全扫描...")
    all_scans = await _scan_all_repos(all_entries)

    print(f"[4/6] AI 分析（{provider}）...")
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

    print("[5/6] 计算评分...")
    data_list = [
        CapabilityData(entry=e, repo=r, analysis=a, scan=sc)
        for e, r, a, sc in zip(all_entries, all_repos, all_analyses, all_scans)
    ]
    all_scores = calculate_scores(data_list)

    print("[6/6] 生成输出...")
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
