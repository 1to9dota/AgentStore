"""自动增量更新脚本

设计为 cron 定期调用，只处理新发现的插件。
流程：
1. 发现新插件（与已有数据对比）
2. 只对新插件执行完整 pipeline
3. 合并到现有数据
4. 更新数据库
5. 记录更新日志
"""
import argparse
import asyncio
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

# 项目根目录
ROOT_DIR = Path(__file__).parent.parent
DATA_DIR = ROOT_DIR / "data"
CAPABILITIES_FILE = DATA_DIR / "capabilities.json"
UPDATE_LOG_FILE = DATA_DIR / "update_log.json"


def _load_existing_data() -> tuple[list[dict], set[str]]:
    """读取现有 capabilities.json，返回 (数据列表, slug 集合)"""
    if not CAPABILITIES_FILE.exists():
        return [], set()
    try:
        data = json.loads(CAPABILITIES_FILE.read_text())
        slugs = {item["slug"] for item in data if "slug" in item}
        return data, slugs
    except (json.JSONDecodeError, KeyError):
        return [], set()


async def _discover_all(
    openclaw_limit: int = 100,
    mcp_limit: int = 200,
) -> list:
    """调用 discover 模块获取最新的插件列表"""
    from .discover_openclaw import discover_openclaw_skills
    from .discover_mcp import discover_mcp_plugins

    openclaw_entries = []
    mcp_entries = []

    if openclaw_limit > 0 and mcp_limit > 0:
        openclaw_entries, mcp_entries = await asyncio.gather(
            discover_openclaw_skills(limit=openclaw_limit),
            discover_mcp_plugins(limit=mcp_limit),
        )
    elif openclaw_limit > 0:
        openclaw_entries = await discover_openclaw_skills(limit=openclaw_limit)
    elif mcp_limit > 0:
        mcp_entries = await discover_mcp_plugins(limit=mcp_limit)

    return openclaw_entries + mcp_entries


async def _process_new_entries(new_entries: list) -> list[dict]:
    """对新插件执行 collect → scan → analyze → score 流程，返回结果字典列表"""
    from .collect import collect_repo_data
    from .ai_analyzer import create_analyzer
    from .score import calculate_scores
    from .category_cleaner import clean_category
    from .models import CapabilityData
    from .pipeline import assemble_output, _scan_all_repos

    token = os.getenv("GITHUB_TOKEN", "")
    provider = os.getenv("AI_PROVIDER", "openai")

    # 采集 GitHub 数据
    print(f"  [collect] 采集 {len(new_entries)} 个插件的 GitHub 数据...")
    all_repos = await collect_repo_data(new_entries, token=token)

    # 安全扫描
    print(f"  [scan] 安全扫描 {len(new_entries)} 个插件...")
    all_scans = await _scan_all_repos(new_entries)

    # AI 分析
    print(f"  [analyze] AI 分析（{provider}）...")
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

    from .models import AnalysisResult

    async def _analyze_one(entry, repo):
        async with sem:
            try:
                return await analyzer.analyze(entry.name, repo.readme_text, entry.description)
            except Exception as e:
                print(f"    AI 分析失败: {entry.name} - {e}")
                return AnalysisResult()

    all_analyses = await asyncio.gather(
        *[_analyze_one(e, r) for e, r in zip(new_entries, all_repos)]
    )

    # 计算评分
    print("  [score] 计算评分...")
    data_list = [
        CapabilityData(entry=e, repo=r, analysis=a, scan=sc)
        for e, r, a, sc in zip(new_entries, all_repos, all_analyses, all_scans)
    ]
    all_scores = calculate_scores(data_list)

    # 组装输出
    results = [
        assemble_output(e, r, a, s)
        for e, r, a, s in zip(new_entries, all_repos, all_analyses, all_scores)
    ]
    return results


def _merge_results(existing_data: list[dict], new_results: list[dict]) -> list[dict]:
    """合并已有数据和新数据，按 overall_score 降序排列"""
    new_slugs = {item["slug"] for item in new_results}
    # 保留已有数据中不重复的条目
    merged = [item for item in existing_data if item["slug"] not in new_slugs]
    merged.extend(new_results)
    merged.sort(key=lambda x: x.get("overall_score", 0), reverse=True)
    return merged


def _save_capabilities(data: list[dict]):
    """保存 capabilities.json 到 data/ 和 web/data/"""
    DATA_DIR.mkdir(exist_ok=True)
    CAPABILITIES_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2))

    # 同步到前端
    web_data = ROOT_DIR / "web" / "data"
    web_data.mkdir(parents=True, exist_ok=True)
    (web_data / "capabilities.json").write_text(
        json.dumps(data, ensure_ascii=False, indent=2)
    )


def _update_database(new_results: list[dict]):
    """增量更新 SQLite 数据库（INSERT OR REPLACE）"""
    sys.path.insert(0, str(ROOT_DIR))
    from api.database import init_db, insert_capabilities

    init_db()
    insert_capabilities(new_results)


def _write_update_log(
    new_count: int,
    failed_list: list[str],
    total_discovered: int,
    total_existing: int,
    forced: bool,
):
    """追加更新日志到 data/update_log.json"""
    log_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_discovered": total_discovered,
        "total_existing": total_existing,
        "new_count": new_count,
        "failed": failed_list,
        "forced": forced,
    }

    # 读取已有日志
    logs = []
    if UPDATE_LOG_FILE.exists():
        try:
            logs = json.loads(UPDATE_LOG_FILE.read_text())
        except (json.JSONDecodeError, TypeError):
            logs = []

    logs.append(log_entry)

    # 只保留最近 100 条日志
    if len(logs) > 100:
        logs = logs[-100:]

    UPDATE_LOG_FILE.write_text(json.dumps(logs, ensure_ascii=False, indent=2))
    print(f"  更新日志已写入 {UPDATE_LOG_FILE}")


async def auto_update(
    force: bool = False,
    dry_run: bool = False,
    openclaw_limit: int = 100,
    mcp_limit: int = 200,
):
    """自动增量更新主函数

    Args:
        force: 强制全量更新，忽略已有数据
        dry_run: 只打印将要更新的插件，不实际执行
        openclaw_limit: OpenClaw 数据源最大抓取数量
        mcp_limit: MCP 数据源最大抓取数量
    """
    print("=" * 50)
    print(f"AgentStore 自动更新 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 50)

    # 1. 读取现有数据
    existing_data, existing_slugs = _load_existing_data()
    print(f"[1/5] 已有 {len(existing_slugs)} 个插件")

    if force:
        print("  ⚠ 强制全量更新模式")
        existing_slugs = set()

    # 2. 发现新插件
    print("[2/5] 发现插件列表...")
    all_entries = await _discover_all(
        openclaw_limit=openclaw_limit,
        mcp_limit=mcp_limit,
    )
    print(f"  共发现 {len(all_entries)} 个插件")

    # 3. diff 出新增的插件
    new_entries = [e for e in all_entries if e.slug not in existing_slugs]
    skipped = len(all_entries) - len(new_entries)
    print(f"[3/5] 新增 {len(new_entries)} 个，跳过 {skipped} 个已有插件")

    if not new_entries:
        print("  没有新插件需要处理，退出。")
        _write_update_log(
            new_count=0,
            failed_list=[],
            total_discovered=len(all_entries),
            total_existing=len(existing_slugs),
            forced=force,
        )
        return

    # dry-run 模式：只打印要更新的插件
    if dry_run:
        print("\n[dry-run] 以下插件将被处理：")
        for i, entry in enumerate(new_entries, 1):
            print(f"  {i}. {entry.name} ({entry.slug}) - {entry.source}")
        print(f"\n共 {len(new_entries)} 个插件待处理。")
        return

    # 4. 对新插件执行完整 pipeline
    print(f"[4/5] 处理 {len(new_entries)} 个新插件...")
    failed_list = []
    try:
        new_results = await _process_new_entries(new_entries)
    except Exception as e:
        print(f"  处理失败: {e}")
        failed_list = [entry.slug for entry in new_entries]
        new_results = []

    # 记录处理失败的插件（没有 overall_score 或 score 为 0 的）
    successful_results = []
    for result in new_results:
        if result.get("overall_score", 0) > 0:
            successful_results.append(result)
        else:
            failed_list.append(result.get("slug", "unknown"))

    print(f"  成功: {len(successful_results)}, 失败: {len(failed_list)}")

    # 5. 合并并保存
    print("[5/5] 合并数据并保存...")
    if force:
        # 强制更新时用全部新结果
        merged = new_results
        merged.sort(key=lambda x: x.get("overall_score", 0), reverse=True)
    else:
        merged = _merge_results(existing_data, successful_results)

    _save_capabilities(merged)
    print(f"  capabilities.json 已更新（共 {len(merged)} 个插件）")

    # 更新数据库
    if successful_results:
        _update_database(successful_results)
        print(f"  数据库已增量更新 {len(successful_results)} 条记录")

    # 写更新日志
    _write_update_log(
        new_count=len(successful_results),
        failed_list=failed_list,
        total_discovered=len(all_entries),
        total_existing=len(existing_data),
        forced=force,
    )

    print(f"\n完成！新增 {len(successful_results)} 个插件，共 {len(merged)} 个。")


def main():
    parser = argparse.ArgumentParser(description="AgentStore 自动增量更新")
    parser.add_argument(
        "--force",
        action="store_true",
        help="强制全量更新，忽略已有数据",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="只打印将要更新的插件，不实际执行",
    )
    parser.add_argument(
        "--openclaw-limit",
        type=int,
        default=100,
        help="OpenClaw 数据源最大抓取数量（默认 100）",
    )
    parser.add_argument(
        "--mcp-limit",
        type=int,
        default=200,
        help="MCP 数据源最大抓取数量（默认 200）",
    )
    args = parser.parse_args()

    asyncio.run(auto_update(
        force=args.force,
        dry_run=args.dry_run,
        openclaw_limit=args.openclaw_limit,
        mcp_limit=args.mcp_limit,
    ))


if __name__ == "__main__":
    main()
