"""GitHub 数据采集"""
import asyncio
import base64
import json
import re
from urllib.parse import urlparse
import httpx
from .models import CapabilityEntry, RepoData


# 兼容性关键词映射（pattern → client 标签）
_CLIENT_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(r'\bclaude\s*desktop\b', re.IGNORECASE), "claude"),
    (re.compile(r'\bclaude\b', re.IGNORECASE), "claude"),
    (re.compile(r'\bcursor\b', re.IGNORECASE), "cursor"),
    (re.compile(r'\bwindsurf\b', re.IGNORECASE), "windsurf"),
    (re.compile(r'\bvs\s*code\b', re.IGNORECASE), "vscode"),
    (re.compile(r'\bvscode\b', re.IGNORECASE), "vscode"),
    (re.compile(r'\bcline\b', re.IGNORECASE), "cline"),
]


_TEST_DIRS = frozenset({
    "tests", "test", "__tests__", "spec", "__test__",
    "pytest.ini", "jest.config.js", "vitest.config.ts",
})

_MAX_RETRIES = 3
_BACKOFF_SECONDS = [1, 2, 4]


async def _request_with_retry(client: httpx.AsyncClient, url: str, **kwargs) -> httpx.Response:
    """带 3 次重试 + exponential backoff 的 HTTP 请求，处理 403 rate limit"""
    for attempt in range(_MAX_RETRIES):
        try:
            resp = await client.get(url, **kwargs)
            if resp.status_code == 403:
                # GitHub rate limit
                remaining = resp.headers.get("X-RateLimit-Remaining", "?")
                reset_at = resp.headers.get("X-RateLimit-Reset", "?")
                print(f"  ⚠ GitHub 403 rate limit: 剩余额度={remaining}, 重置时间={reset_at}")
                if attempt < _MAX_RETRIES - 1:
                    wait = _BACKOFF_SECONDS[attempt]
                    print(f"    等待 {wait}s 后重试 ({attempt + 1}/{_MAX_RETRIES})...")
                    await asyncio.sleep(wait)
                    continue
                else:
                    raise httpx.HTTPStatusError(
                        f"GitHub rate limit exceeded after {_MAX_RETRIES} retries",
                        request=resp.request, response=resp
                    )
            return resp
        except (httpx.TimeoutException, httpx.ConnectError) as e:
            if attempt < _MAX_RETRIES - 1:
                wait = _BACKOFF_SECONDS[attempt]
                print(f"  ⚠ 请求失败: {e}, 等待 {wait}s 后重试 ({attempt + 1}/{_MAX_RETRIES})...")
                await asyncio.sleep(wait)
            else:
                raise
    # 不应到达这里，但兜底返回最后一次的响应
    return resp  # type: ignore


def _parse_owner_repo(url: str) -> tuple[str, str] | None:
    if not url or "github.com" not in url:
        return None
    parsed = urlparse(url)
    # 路径格式: /owner/repo 或 /owner/repo/tree/main 等
    segments = [s for s in parsed.path.split("/") if s]
    if len(segments) >= 2:
        return segments[0], segments[1]
    return None


def _detect_clients(readme_text: str) -> list[str]:
    """从 README 文本中检测支持的客户端（case-insensitive）"""
    if not readme_text:
        return []
    seen: set[str] = set()
    clients: list[str] = []
    for pattern, client in _CLIENT_PATTERNS:
        if client not in seen and pattern.search(readme_text):
            seen.add(client)
            clients.append(client)
    return clients


async def fetch_repo_data(owner: str, repo: str, *, token: str) -> RepoData:
    headers = {"Authorization": f"token {token}", "Accept": "application/vnd.github.v3+json"}
    async with httpx.AsyncClient(base_url="https://api.github.com", headers=headers, timeout=15) as client:
        repo_resp, contrib_resp, issues_resp, readme_resp, contents_resp, releases_resp = await asyncio.gather(
            _request_with_retry(client, f"/repos/{owner}/{repo}"),
            _request_with_retry(client, f"/repos/{owner}/{repo}/contributors", params={"per_page": 1}),
            _request_with_retry(client, f"/repos/{owner}/{repo}/issues", params={"state": "closed", "per_page": 1}),
            _request_with_retry(client, f"/repos/{owner}/{repo}/readme"),
            _request_with_retry(client, f"/repos/{owner}/{repo}/contents"),
            _request_with_retry(client, f"/repos/{owner}/{repo}/releases", params={"per_page": 1}),
            return_exceptions=True,
        )

        repo_data = RepoData()
        if isinstance(repo_resp, httpx.Response) and repo_resp.status_code == 200:
            r = repo_resp.json()
            repo_data.stars = r.get("stargazers_count", 0)
            repo_data.forks = r.get("forks_count", 0)
            repo_data.language = r.get("language")
            repo_data.last_updated = r.get("pushed_at", "")
            repo_data.open_issues = r.get("open_issues_count", 0)

        if isinstance(contrib_resp, httpx.Response) and contrib_resp.status_code == 200:
            link = contrib_resp.headers.get("link", "")
            if "last" in link:
                m = re.search(r'page=(\d+)>; rel="last"', link)
                repo_data.contributors = int(m.group(1)) if m else 1
            else:
                repo_data.contributors = len(contrib_resp.json()) if isinstance(contrib_resp.json(), list) else 1

        if isinstance(issues_resp, httpx.Response) and issues_resp.status_code == 200:
            link = issues_resp.headers.get("link", "")
            if "last" in link:
                m = re.search(r'page=(\d+)>; rel="last"', link)
                repo_data.closed_issues = int(m.group(1)) if m else 0
            else:
                repo_data.closed_issues = len(issues_resp.json()) if isinstance(issues_resp.json(), list) else 0

        if isinstance(readme_resp, httpx.Response) and readme_resp.status_code == 200:
            content = readme_resp.json().get("content", "")
            try:
                repo_data.readme_text = base64.b64decode(content).decode("utf-8", errors="replace")
                repo_data.readme_length = len(repo_data.readme_text)
            except Exception:
                pass

        if isinstance(contents_resp, httpx.Response) and contents_resp.status_code == 200:
            files = {f.get("name", "") for f in contents_resp.json() if isinstance(f, dict)}
            repo_data.has_typescript = "tsconfig.json" in files or repo_data.language == "TypeScript"
            repo_data.has_tests = bool(files & _TEST_DIRS)

            # 提取 package.json 中的依赖
            if "package.json" in files:
                try:
                    pkg_resp = await _request_with_retry(
                        client, f"/repos/{owner}/{repo}/contents/package.json"
                    )
                    if isinstance(pkg_resp, httpx.Response) and pkg_resp.status_code == 200:
                        pkg_content = base64.b64decode(
                            pkg_resp.json().get("content", "")
                        ).decode("utf-8", errors="replace")
                        pkg_json = json.loads(pkg_content)
                        deps = list(pkg_json.get("dependencies", {}).keys())
                        repo_data.dependencies = deps[:10]
                except Exception:
                    pass  # package.json 解析失败不影响其他数据

        # 提取最新 release 版本号
        if isinstance(releases_resp, httpx.Response) and releases_resp.status_code == 200:
            releases = releases_resp.json()
            if isinstance(releases, list) and releases:
                repo_data.latest_version = releases[0].get("tag_name", "")

        # 如果没有 release，尝试用 tags 获取版本号
        if not repo_data.latest_version:
            try:
                tags_resp = await _request_with_retry(
                    client, f"/repos/{owner}/{repo}/tags", params={"per_page": 1}
                )
                if isinstance(tags_resp, httpx.Response) and tags_resp.status_code == 200:
                    tags = tags_resp.json()
                    if isinstance(tags, list) and tags:
                        repo_data.latest_version = tags[0].get("name", "")
            except Exception:
                pass  # tags 获取失败不影响其他数据

        # 从 README 检测支持的客户端
        repo_data.supported_clients = _detect_clients(repo_data.readme_text)

        return repo_data


async def collect_repo_data(entries: list[CapabilityEntry], *, token: str) -> list[RepoData]:
    sem = asyncio.Semaphore(5)
    total = len(entries)
    progress = {"done": 0}

    async def _fetch_one(entry: CapabilityEntry) -> RepoData:
        async with sem:
            if not entry.repo_url:
                result = RepoData()
            else:
                parsed = _parse_owner_repo(entry.repo_url)
                if not parsed:
                    result = RepoData()
                else:
                    result = await fetch_repo_data(parsed[0], parsed[1], token=token)
            progress["done"] += 1
            print(f"  [{progress['done']}/{total}] 采集 {entry.name}")
            return result

    results = await asyncio.gather(*[_fetch_one(e) for e in entries], return_exceptions=True)
    return [r if isinstance(r, RepoData) else RepoData() for r in results]
