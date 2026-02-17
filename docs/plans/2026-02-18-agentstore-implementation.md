# AgentStore Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an Agent capability registry + trust system (discovery + rating) with REST API, Python data pipeline, and Next.js frontend.

**Architecture:** Python data pipeline (adapted from AgentRating) discovers and scores Agent capabilities from OpenClaw/MCP ecosystems. FastAPI serves REST API for agent queries. Next.js SSG frontend for human browsing with 5-dimension radar charts.

**Tech Stack:** Python 3.11+ / FastAPI / SQLite / Next.js 16 / React 19 / TailwindCSS 4 / OpenAI API (multi-model support)

---

## Task 1: 项目骨架和依赖

**Files:**
- Create: `scripts/__init__.py`
- Create: `scripts/models.py`
- Create: `pyproject.toml`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `tests/__init__.py`

**Step 1: 创建 pyproject.toml**

```toml
[project]
name = "agentstore"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "httpx>=0.27",
    "openai>=1.0",
    "anthropic>=0.40",
    "google-genai>=1.0",
    "fastapi>=0.115",
    "uvicorn>=0.34",
    "python-dotenv>=1.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-asyncio>=0.24",
    "respx>=0.22",
    "httpx[http2]",
]
```

**Step 2: 创建 .env.example**

```env
# AI 分析引擎（选一个）
AI_PROVIDER=openai
OPENAI_API_KEY=sk-xxx
# ANTHROPIC_API_KEY=sk-ant-xxx
# GEMINI_API_KEY=xxx
# OLLAMA_MODEL=llama3

# GitHub API
GITHUB_TOKEN=ghp_xxx

# OpenClaw ClawHub
CLAWHUB_API_URL=https://hub.openclaw.ai/api
```

**Step 3: 创建 .gitignore**

```
__pycache__/
*.pyc
.env
*.db
.venv/
node_modules/
.next/
data/*.json
```

**Step 4: 创建数据模型 `scripts/models.py`**

```python
"""AgentStore 数据模型"""
from dataclasses import dataclass, field


@dataclass
class CapabilityEntry:
    """从数据源发现的原始能力条目"""
    name: str
    source: str           # "openclaw" | "mcp"
    source_id: str        # 原始 skill/plugin ID
    provider: str         # GitHub user 或 agent ID
    description: str
    category: str
    repo_url: str | None = None
    endpoint: str | None = None
    protocol: str = "rest"  # "rest" | "mcp" | "openclaw"

    @property
    def slug(self) -> str:
        return f"{self.source}-{self.source_id}".lower()


@dataclass
class RepoData:
    """从 GitHub 采集的仓库数据"""
    stars: int = 0
    forks: int = 0
    language: str | None = None
    last_updated: str = ""
    open_issues: int = 0
    closed_issues: int = 0
    contributors: int = 0
    has_typescript: bool = False
    has_tests: bool = False
    readme_text: str = ""
    readme_length: int = 0


@dataclass
class AnalysisResult:
    """AI 分析结果"""
    reliability_score: float = 0.0    # 可靠性评估
    safety_score: float = 0.0         # 安全性评估
    capability_score: float = 0.0     # 能力范围评估
    usability_score: float = 0.0      # 易用性评估
    summary: str = ""
    one_liner: str = ""
    install_guide: str = ""
    usage_guide: str = ""
    safety_notes: str = ""            # 安全分析说明
    category_suggestion: str = ""


@dataclass
class Scores:
    """5 维评分结果"""
    reliability: float = 0.0    # 可靠性 (25%)
    safety: float = 0.0         # 安全性 (25%)
    capability: float = 0.0     # 能力范围 (20%)
    reputation: float = 0.0     # 社区口碑 (15%)
    usability: float = 0.0      # 易用性 (15%)
    overall: float = 0.0        # 加权综合


@dataclass
class CapabilityData:
    """评分引擎的输入（组合 RepoData + AnalysisResult）"""
    entry: CapabilityEntry
    repo: RepoData = field(default_factory=RepoData)
    analysis: AnalysisResult = field(default_factory=AnalysisResult)
```

**Step 5: 创建空 __init__.py 文件**

```bash
touch scripts/__init__.py tests/__init__.py
```

**Step 6: 安装依赖并验证**

Run: `cd /Users/zekunmac/_HUB_LOCAL/AgentStore && uv sync`
Expected: 依赖安装成功

**Step 7: 提交**

```bash
git add pyproject.toml .env.example .gitignore scripts/ tests/
git commit -m "feat: project scaffold with data models and dependencies"
```

---

## Task 2: 评分引擎（TDD）

**Files:**
- Create: `scripts/score.py`
- Create: `tests/test_score.py`

**Step 1: 写失败测试**

```python
# tests/test_score.py
"""评分引擎测试"""
import pytest
from scripts.models import CapabilityEntry, CapabilityData, RepoData, AnalysisResult, Scores
from scripts.score import calculate_scores, _score_reliability, _score_safety, _score_capability, _score_reputation, _score_usability


def _make_data(**overrides) -> CapabilityData:
    """测试用工厂方法"""
    entry = CapabilityEntry(
        name="test-skill",
        source="openclaw",
        source_id="test-1",
        provider="testuser",
        description="A test capability",
        category="development",
    )
    repo = RepoData(
        stars=100, forks=20, language="Python",
        last_updated="2026-02-15T00:00:00Z",
        open_issues=5, closed_issues=45, contributors=8,
        has_typescript=False, has_tests=True,
        readme_text="# Test\nGood docs here", readme_length=500,
    )
    analysis = AnalysisResult(
        reliability_score=7.0, safety_score=8.0,
        capability_score=6.5, usability_score=7.5,
        summary="Good tool", one_liner="A test tool",
    )
    data = CapabilityData(entry=entry, repo=repo, analysis=analysis)
    # 覆盖字段
    for k, v in overrides.items():
        if hasattr(data.repo, k):
            setattr(data.repo, k, v)
        elif hasattr(data.analysis, k):
            setattr(data.analysis, k, v)
    return data


class TestReliability:
    def test_high_ai_score_and_active_maintenance(self):
        data = _make_data(reliability_score=9.0, last_updated="2026-02-17T00:00:00Z")
        score = _score_reliability(data)
        assert 8.0 <= score <= 10.0

    def test_low_ai_score_old_repo(self):
        data = _make_data(reliability_score=2.0, last_updated="2024-01-01T00:00:00Z")
        score = _score_reliability(data)
        assert 0.0 <= score <= 4.0

    def test_clamp_to_range(self):
        data = _make_data(reliability_score=15.0)
        score = _score_reliability(data)
        assert 0.0 <= score <= 10.0


class TestSafety:
    def test_high_safety_score(self):
        data = _make_data(safety_score=9.0)
        score = _score_safety(data)
        assert 7.0 <= score <= 10.0

    def test_low_safety_score(self):
        data = _make_data(safety_score=2.0)
        score = _score_safety(data)
        assert 0.0 <= score <= 5.0


class TestCapability:
    def test_good_capability(self):
        data = _make_data(capability_score=8.0, has_tests=True)
        score = _score_capability(data)
        assert 6.0 <= score <= 10.0


class TestReputation:
    def test_popular_repo(self):
        data = _make_data(stars=5000, forks=500, closed_issues=90, open_issues=10, contributors=20)
        score = _score_reputation(data)
        assert 7.0 <= score <= 10.0

    def test_new_repo(self):
        data = _make_data(stars=2, forks=0, closed_issues=0, open_issues=0, contributors=1)
        score = _score_reputation(data)
        assert 0.0 <= score <= 4.0


class TestUsability:
    def test_good_docs(self):
        data = _make_data(usability_score=8.5, readme_length=3000)
        score = _score_usability(data)
        assert 7.0 <= score <= 10.0


class TestOverall:
    def test_weighted_average(self):
        data = _make_data()
        results = calculate_scores([data])
        assert len(results) == 1
        s = results[0]
        assert 0.0 <= s.overall <= 10.0
        # 验证加权公式
        expected = round(
            s.reliability * 0.25 + s.safety * 0.25 +
            s.capability * 0.20 + s.reputation * 0.15 +
            s.usability * 0.15, 1
        )
        assert s.overall == expected

    def test_empty_list(self):
        assert calculate_scores([]) == []
```

**Step 2: 运行测试，确认失败**

Run: `cd /Users/zekunmac/_HUB_LOCAL/AgentStore && uv run pytest tests/test_score.py -v`
Expected: FAIL - `ModuleNotFoundError: No module named 'scripts.score'`

**Step 3: 实现评分引擎**

```python
# scripts/score.py
"""AgentStore 5 维评分引擎

维度和权重：
- reliability (可靠性): 25%
- safety (安全性): 25%
- capability (能力范围): 20%
- reputation (社区口碑): 15%
- usability (易用性): 15%
"""
import math
from datetime import datetime, timezone
from .models import CapabilityData, Scores


def _clamp(value: float, lo: float = 0.0, hi: float = 10.0) -> float:
    return max(lo, min(hi, value))


def _days_since(iso_date: str) -> int:
    """计算距今天数"""
    try:
        dt = datetime.fromisoformat(iso_date.replace("Z", "+00:00"))
        return (datetime.now(timezone.utc) - dt).days
    except (ValueError, AttributeError):
        return 999


def _score_reliability(data: CapabilityData) -> float:
    """可靠性 = AI 评估 (70%) + 维护活跃度 (30%)"""
    ai_part = data.analysis.reliability_score * 0.7

    days = _days_since(data.repo.last_updated)
    if days <= 7:
        maint = 10.0
    elif days <= 30:
        maint = 8.5
    elif days <= 90:
        maint = 7.0
    elif days <= 180:
        maint = 5.0
    elif days <= 365:
        maint = 3.0
    else:
        maint = 1.0
    maint_part = maint * 0.3

    return _clamp(ai_part + maint_part)


def _score_safety(data: CapabilityData) -> float:
    """安全性 = AI 审计评估 (85%) + 代码质量指标 (15%)"""
    ai_part = data.analysis.safety_score * 0.85

    # 有测试 +1.0，有 TypeScript +0.5（类型安全）
    code_bonus = 0.0
    if data.repo.has_tests:
        code_bonus += 1.0
    if data.repo.has_typescript:
        code_bonus += 0.5
    code_part = code_bonus

    return _clamp(ai_part + code_part)


def _score_capability(data: CapabilityData) -> float:
    """能力范围 = AI 评估 (80%) + 代码成熟度 (20%)"""
    ai_part = data.analysis.capability_score * 0.8

    maturity = 0.0
    if data.repo.has_tests:
        maturity += 1.0
    if data.repo.contributors >= 3:
        maturity += 0.5
    if data.repo.readme_length >= 1000:
        maturity += 0.5
    maturity_part = maturity

    return _clamp(ai_part + maturity_part)


def _score_reputation(data: CapabilityData) -> float:
    """社区口碑 = star (40%) + issue 关闭率 (30%) + 贡献者 (30%)"""
    # star 对数评分（base=50）
    star_score = min(10.0, math.log(max(data.repo.stars, 1) / 50 + 1) / math.log(200) * 10)
    star_part = star_score * 0.4

    # issue 关闭率
    total_issues = data.repo.open_issues + data.repo.closed_issues
    if total_issues > 0:
        close_rate = data.repo.closed_issues / total_issues
        issue_score = close_rate * 10.0
    else:
        issue_score = 5.0  # 没有 issue 给中等分
    issue_part = issue_score * 0.3

    # 贡献者数（对数）
    contrib_score = min(10.0, math.log(max(data.repo.contributors, 1) + 1) / math.log(20) * 10)
    contrib_part = contrib_score * 0.3

    return _clamp(star_part + issue_part + contrib_part)


def _score_usability(data: CapabilityData) -> float:
    """易用性 = AI 评估 (75%) + 文档长度 (25%)"""
    ai_part = data.analysis.usability_score * 0.75

    # README 长度评分
    doc_score = min(2.5, data.repo.readme_length / 3000 * 2.5)
    doc_part = doc_score

    return _clamp(ai_part + doc_part)


def calculate_scores(data_list: list[CapabilityData]) -> list[Scores]:
    """计算所有能力的 5 维评分"""
    results = []
    for data in data_list:
        reliability = round(_score_reliability(data), 1)
        safety = round(_score_safety(data), 1)
        capability = round(_score_capability(data), 1)
        reputation = round(_score_reputation(data), 1)
        usability = round(_score_usability(data), 1)
        overall = round(
            reliability * 0.25 + safety * 0.25 +
            capability * 0.20 + reputation * 0.15 +
            usability * 0.15, 1
        )
        results.append(Scores(
            reliability=reliability,
            safety=safety,
            capability=capability,
            reputation=reputation,
            usability=usability,
            overall=overall,
        ))
    return results
```

**Step 4: 运行测试，确认通过**

Run: `cd /Users/zekunmac/_HUB_LOCAL/AgentStore && uv run pytest tests/test_score.py -v`
Expected: ALL PASS

**Step 5: 提交**

```bash
git add scripts/score.py tests/test_score.py
git commit -m "feat: 5-dimension scoring engine with TDD tests"
```

---

## Task 3: AI 分析引擎（多模型支持）

**Files:**
- Create: `scripts/ai_analyzer.py`
- Create: `tests/test_ai_analyzer.py`

**Step 1: 写失败测试**

```python
# tests/test_ai_analyzer.py
"""AI 分析引擎测试"""
import pytest
from scripts.ai_analyzer import create_analyzer, AIAnalyzer
from scripts.models import AnalysisResult


class TestCreateAnalyzer:
    def test_openai_provider(self):
        analyzer = create_analyzer(provider="openai", api_key="test-key")
        assert isinstance(analyzer, AIAnalyzer)

    def test_unknown_provider_raises(self):
        with pytest.raises(ValueError, match="Unsupported"):
            create_analyzer(provider="unknown")


class TestAnalysisPrompt:
    def test_system_prompt_contains_scoring_rubric(self):
        analyzer = create_analyzer(provider="openai", api_key="test-key")
        prompt = analyzer.get_system_prompt()
        assert "reliability" in prompt.lower()
        assert "safety" in prompt.lower()
        assert "capability" in prompt.lower()
        assert "usability" in prompt.lower()


class TestParseResponse:
    def test_valid_json_response(self):
        analyzer = create_analyzer(provider="openai", api_key="test-key")
        raw = '''{
            "reliability_score": 7.5,
            "safety_score": 8.0,
            "capability_score": 6.5,
            "usability_score": 7.0,
            "summary": "A good tool",
            "one_liner": "Test tool",
            "install_guide": "pip install test",
            "usage_guide": "Use it like this",
            "safety_notes": "No known issues",
            "category_suggestion": "development"
        }'''
        result = analyzer.parse_response(raw)
        assert isinstance(result, AnalysisResult)
        assert result.reliability_score == 7.5
        assert result.safety_score == 8.0

    def test_malformed_json_returns_defaults(self):
        analyzer = create_analyzer(provider="openai", api_key="test-key")
        result = analyzer.parse_response("not json")
        assert isinstance(result, AnalysisResult)
        assert result.reliability_score == 0.0
```

**Step 2: 运行测试，确认失败**

Run: `cd /Users/zekunmac/_HUB_LOCAL/AgentStore && uv run pytest tests/test_ai_analyzer.py -v`
Expected: FAIL

**Step 3: 实现 AI 分析引擎**

```python
# scripts/ai_analyzer.py
"""多模型 AI 分析引擎

支持: openai / anthropic / gemini / ollama
通过 .env 中的 AI_PROVIDER 配置切换
"""
import json
from abc import ABC, abstractmethod
from .models import AnalysisResult


_SYSTEM_PROMPT = """你是一个 AI Agent 能力评估专家。分析给定的 Agent 能力（skill/plugin），从以下 4 个维度评分（0-10）：

1. **reliability_score** (可靠性): 代码质量、错误处理、稳定性
   - 9-10: 生产级，完善的错误处理和测试
   - 5-6: 能用但有粗糙之处
   - 0-2: 实验性，可能频繁出错

2. **safety_score** (安全性): 权限范围、数据泄露风险、恶意行为
   - 9-10: 最小权限原则，无数据泄露风险
   - 5-6: 权限合理但缺乏明确说明
   - 0-2: 权限过大或有安全隐患

3. **capability_score** (能力范围): 功能完整度、边界情况处理
   - 9-10: 功能完整，覆盖边界情况
   - 5-6: 核心功能可用，边界情况不足
   - 0-2: 功能原始，仅概念验证

4. **usability_score** (易用性): 文档质量、接口设计、接入门槛
   - 9-10: 文档完善，示例丰富，5 分钟上手
   - 5-6: 基本文档，需要看代码才能用
   - 0-2: 几乎无文档

同时提供：
- summary: 2-3 句话总结（中英双语皆可）
- one_liner: 一句话描述（最多 80 字符）
- install_guide: 安装步骤（Markdown）
- usage_guide: 使用示例（Markdown）
- safety_notes: 安全分析说明
- category_suggestion: 分类建议（development / data / web / productivity / ai / media / trading / communication）

以 JSON 格式返回，字段名和上面完全一致。"""


class AIAnalyzer(ABC):
    """AI 分析引擎基类"""

    def get_system_prompt(self) -> str:
        return _SYSTEM_PROMPT

    @abstractmethod
    async def analyze(self, name: str, readme: str, description: str) -> AnalysisResult:
        """分析 Agent 能力，返回评分结果"""
        ...

    def parse_response(self, raw: str) -> AnalysisResult:
        """解析 AI 返回的 JSON"""
        try:
            # 尝试从 markdown code block 中提取 JSON
            if "```json" in raw:
                raw = raw.split("```json")[1].split("```")[0]
            elif "```" in raw:
                raw = raw.split("```")[1].split("```")[0]
            data = json.loads(raw.strip())
            return AnalysisResult(
                reliability_score=float(data.get("reliability_score", 0)),
                safety_score=float(data.get("safety_score", 0)),
                capability_score=float(data.get("capability_score", 0)),
                usability_score=float(data.get("usability_score", 0)),
                summary=str(data.get("summary", "")),
                one_liner=str(data.get("one_liner", ""))[:80],
                install_guide=str(data.get("install_guide", "")),
                usage_guide=str(data.get("usage_guide", "")),
                safety_notes=str(data.get("safety_notes", "")),
                category_suggestion=str(data.get("category_suggestion", "")),
            )
        except (json.JSONDecodeError, KeyError, TypeError):
            return AnalysisResult()


class OpenAIAnalyzer(AIAnalyzer):
    def __init__(self, api_key: str, model: str = "gpt-4o-mini"):
        from openai import AsyncOpenAI
        self.client = AsyncOpenAI(api_key=api_key)
        self.model = model

    async def analyze(self, name: str, readme: str, description: str) -> AnalysisResult:
        truncated = readme[:8000]
        resp = await self.client.chat.completions.create(
            model=self.model,
            max_tokens=1500,
            messages=[
                {"role": "system", "content": self.get_system_prompt()},
                {"role": "user", "content": f"能力名称: {name}\n描述: {description}\n\nREADME:\n{truncated}"},
            ],
        )
        return self.parse_response(resp.choices[0].message.content or "")


class AnthropicAnalyzer(AIAnalyzer):
    def __init__(self, api_key: str, model: str = "claude-sonnet-4-5-20250929"):
        from anthropic import AsyncAnthropic
        self.client = AsyncAnthropic(api_key=api_key)
        self.model = model

    async def analyze(self, name: str, readme: str, description: str) -> AnalysisResult:
        truncated = readme[:8000]
        resp = await self.client.messages.create(
            model=self.model,
            max_tokens=1500,
            system=self.get_system_prompt(),
            messages=[
                {"role": "user", "content": f"能力名称: {name}\n描述: {description}\n\nREADME:\n{truncated}"},
            ],
        )
        return self.parse_response(resp.content[0].text)


class GeminiAnalyzer(AIAnalyzer):
    def __init__(self, api_key: str, model: str = "gemini-2.0-flash"):
        from google import genai
        self.client = genai.Client(api_key=api_key)
        self.model = model

    async def analyze(self, name: str, readme: str, description: str) -> AnalysisResult:
        truncated = readme[:8000]
        resp = self.client.models.generate_content(
            model=self.model,
            contents=f"{self.get_system_prompt()}\n\n能力名称: {name}\n描述: {description}\n\nREADME:\n{truncated}",
        )
        return self.parse_response(resp.text or "")


class OllamaAnalyzer(AIAnalyzer):
    def __init__(self, model: str = "llama3", base_url: str = "http://localhost:11434"):
        import httpx
        self.model = model
        self.base_url = base_url
        self.client = httpx.AsyncClient(base_url=base_url, timeout=120)

    async def analyze(self, name: str, readme: str, description: str) -> AnalysisResult:
        truncated = readme[:4000]  # 本地模型上下文更小
        resp = await self.client.post("/api/chat", json={
            "model": self.model,
            "stream": False,
            "messages": [
                {"role": "system", "content": self.get_system_prompt()},
                {"role": "user", "content": f"能力名称: {name}\n描述: {description}\n\nREADME:\n{truncated}"},
            ],
        })
        data = resp.json()
        return self.parse_response(data.get("message", {}).get("content", ""))


def create_analyzer(provider: str = "openai", **kwargs) -> AIAnalyzer:
    """工厂方法：根据 provider 创建对应的分析引擎"""
    if provider == "openai":
        return OpenAIAnalyzer(api_key=kwargs.get("api_key", ""))
    elif provider == "anthropic":
        return AnthropicAnalyzer(api_key=kwargs.get("api_key", ""))
    elif provider == "gemini":
        return GeminiAnalyzer(api_key=kwargs.get("api_key", ""))
    elif provider == "ollama":
        return OllamaAnalyzer(model=kwargs.get("model", "llama3"))
    else:
        raise ValueError(f"Unsupported AI provider: {provider}")
```

**Step 4: 运行测试，确认通过**

Run: `cd /Users/zekunmac/_HUB_LOCAL/AgentStore && uv run pytest tests/test_ai_analyzer.py -v`
Expected: ALL PASS

**Step 5: 提交**

```bash
git add scripts/ai_analyzer.py tests/test_ai_analyzer.py
git commit -m "feat: multi-model AI analyzer (OpenAI/Claude/Gemini/Ollama)"
```

---

## Task 4: OpenClaw 数据采集器

**Files:**
- Create: `scripts/discover_openclaw.py`
- Create: `scripts/collect.py`
- Create: `tests/test_discover_openclaw.py`

**Step 1: 写失败测试**

```python
# tests/test_discover_openclaw.py
"""OpenClaw 数据采集测试"""
import pytest
from scripts.discover_openclaw import parse_clawhub_response
from scripts.models import CapabilityEntry


class TestParseClawHub:
    def test_parse_valid_skill(self):
        raw = {
            "skills": [
                {
                    "id": "spotify-dj",
                    "name": "Spotify DJ",
                    "description": "Control Spotify playback",
                    "author": "musicdev",
                    "category": "media",
                    "installs": 1500,
                    "rating": 4.5,
                    "repo_url": "https://github.com/musicdev/spotify-dj",
                }
            ]
        }
        entries = parse_clawhub_response(raw)
        assert len(entries) == 1
        assert entries[0].name == "Spotify DJ"
        assert entries[0].source == "openclaw"
        assert entries[0].source_id == "spotify-dj"

    def test_parse_empty(self):
        entries = parse_clawhub_response({"skills": []})
        assert entries == []

    def test_skip_malformed(self):
        raw = {"skills": [{"id": "bad"}]}  # 缺少必填字段
        entries = parse_clawhub_response(raw)
        assert entries == []
```

**Step 2: 运行测试，确认失败**

Run: `cd /Users/zekunmac/_HUB_LOCAL/AgentStore && uv run pytest tests/test_discover_openclaw.py -v`
Expected: FAIL

**Step 3: 实现 OpenClaw 采集器**

```python
# scripts/discover_openclaw.py
"""OpenClaw ClawHub 数据采集"""
import httpx
from .models import CapabilityEntry


def parse_clawhub_response(raw: dict) -> list[CapabilityEntry]:
    """解析 ClawHub API 返回的 skills 列表"""
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
    """从 ClawHub 采集 skills"""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(f"{api_url}/skills", params={"limit": limit, "sort": "installs"})
        resp.raise_for_status()
        return parse_clawhub_response(resp.json())
```

```python
# scripts/collect.py
"""GitHub 数据采集（复用 AgentRating 模式）"""
import asyncio
import base64
import httpx
from .models import CapabilityEntry, RepoData


_TEST_DIRS = frozenset({
    "tests", "test", "__tests__", "spec", "__test__",
    "pytest.ini", "jest.config.js", "vitest.config.ts",
})


def _parse_owner_repo(url: str) -> tuple[str, str] | None:
    """从 GitHub URL 提取 owner/repo"""
    if not url or "github.com" not in url:
        return None
    parts = url.rstrip("/").split("/")
    if len(parts) >= 2:
        return parts[-2], parts[-1]
    return None


async def fetch_repo_data(owner: str, repo: str, *, token: str) -> RepoData:
    """从 GitHub API 采集仓库数据（5 路并行）"""
    headers = {"Authorization": f"token {token}", "Accept": "application/vnd.github.v3+json"}
    async with httpx.AsyncClient(base_url="https://api.github.com", headers=headers, timeout=15) as client:
        repo_resp, contrib_resp, issues_resp, readme_resp, contents_resp = await asyncio.gather(
            client.get(f"/repos/{owner}/{repo}"),
            client.get(f"/repos/{owner}/{repo}/contributors", params={"per_page": 1}),
            client.get(f"/repos/{owner}/{repo}/issues", params={"state": "closed", "per_page": 1}),
            client.get(f"/repos/{owner}/{repo}/readme"),
            client.get(f"/repos/{owner}/{repo}/contents"),
            return_exceptions=True,
        )

        # 解析仓库基本信息
        repo_data = RepoData()
        if isinstance(repo_resp, httpx.Response) and repo_resp.status_code == 200:
            r = repo_resp.json()
            repo_data.stars = r.get("stargazers_count", 0)
            repo_data.forks = r.get("forks_count", 0)
            repo_data.language = r.get("language")
            repo_data.last_updated = r.get("pushed_at", "")
            repo_data.open_issues = r.get("open_issues_count", 0)

        # 贡献者数
        if isinstance(contrib_resp, httpx.Response) and contrib_resp.status_code == 200:
            # 从 Link header 解析总数，或用列表长度
            link = contrib_resp.headers.get("link", "")
            if "last" in link:
                import re
                m = re.search(r'page=(\d+)>; rel="last"', link)
                repo_data.contributors = int(m.group(1)) if m else 1
            else:
                repo_data.contributors = len(contrib_resp.json()) if isinstance(contrib_resp.json(), list) else 1

        # 已关闭 issue 数
        if isinstance(issues_resp, httpx.Response) and issues_resp.status_code == 200:
            link = issues_resp.headers.get("link", "")
            if "last" in link:
                import re
                m = re.search(r'page=(\d+)>; rel="last"', link)
                repo_data.closed_issues = int(m.group(1)) if m else 0
            else:
                repo_data.closed_issues = len(issues_resp.json()) if isinstance(issues_resp.json(), list) else 0

        # README
        if isinstance(readme_resp, httpx.Response) and readme_resp.status_code == 200:
            content = readme_resp.json().get("content", "")
            try:
                repo_data.readme_text = base64.b64decode(content).decode("utf-8", errors="replace")
                repo_data.readme_length = len(repo_data.readme_text)
            except Exception:
                pass

        # 检测 TypeScript 和测试
        if isinstance(contents_resp, httpx.Response) and contents_resp.status_code == 200:
            files = {f.get("name", "") for f in contents_resp.json() if isinstance(f, dict)}
            repo_data.has_typescript = "tsconfig.json" in files or repo_data.language == "TypeScript"
            repo_data.has_tests = bool(files & _TEST_DIRS)

        return repo_data


async def collect_repo_data(entries: list[CapabilityEntry], *, token: str) -> list[RepoData]:
    """批量采集仓库数据"""
    sem = asyncio.Semaphore(5)
    results = []

    async def _fetch_one(entry: CapabilityEntry) -> RepoData:
        async with sem:
            if not entry.repo_url:
                return RepoData()
            parsed = _parse_owner_repo(entry.repo_url)
            if not parsed:
                return RepoData()
            return await fetch_repo_data(parsed[0], parsed[1], token=token)

    tasks = [_fetch_one(e) for e in entries]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return [r if isinstance(r, RepoData) else RepoData() for r in results]
```

**Step 4: 运行测试，确认通过**

Run: `cd /Users/zekunmac/_HUB_LOCAL/AgentStore && uv run pytest tests/test_discover_openclaw.py -v`
Expected: ALL PASS

**Step 5: 提交**

```bash
git add scripts/discover_openclaw.py scripts/collect.py tests/test_discover_openclaw.py
git commit -m "feat: OpenClaw discovery + GitHub data collection"
```

---

## Task 5: MCP 数据源（复用 AgentRating）

**Files:**
- Create: `scripts/discover_mcp.py`
- Create: `tests/test_discover_mcp.py`

**Step 1: 写失败测试**

```python
# tests/test_discover_mcp.py
"""MCP 数据源测试"""
import pytest
from scripts.discover_mcp import parse_awesome_list
from scripts.models import CapabilityEntry


class TestParseAwesomeList:
    def test_parse_entry(self):
        md = """## Development & Coding
- [test-plugin](https://github.com/owner/test-plugin) - A test MCP plugin"""
        entries = parse_awesome_list(md)
        assert len(entries) == 1
        assert entries[0].name == "test-plugin"
        assert entries[0].source == "mcp"
        assert entries[0].provider == "owner"
        assert entries[0].repo_url == "https://github.com/owner/test-plugin"

    def test_dedup_by_slug(self):
        md = """## Cat A
- [plug](https://github.com/a/plug) - desc
## Cat B
- [plug](https://github.com/a/plug) - desc again"""
        entries = parse_awesome_list(md)
        assert len(entries) == 1
```

**Step 2: 运行测试，确认失败**

Run: `cd /Users/zekunmac/_HUB_LOCAL/AgentStore && uv run pytest tests/test_discover_mcp.py -v`
Expected: FAIL

**Step 3: 实现 MCP 数据源（从 AgentRating 移植）**

```python
# scripts/discover_mcp.py
"""MCP 插件数据源（移植自 AgentRating discover.py）"""
import re
import httpx
from .models import CapabilityEntry

_ENTRY_RE = r"-\s+\[([^\]]+)\]\(https://github\.com/([^/]+)/([^/)]+)\)\s*[^-]*-\s*(.*)"
_CATEGORY_RE = r"^##\s+(.+)$"

_AWESOME_URL = "https://raw.githubusercontent.com/punkpeye/awesome-mcp-servers/main/README.md"


def parse_awesome_list(md: str) -> list[CapabilityEntry]:
    """解析 awesome-mcp-servers markdown"""
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
    """从 awesome-mcp-servers 采集 MCP 插件"""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(_AWESOME_URL)
        resp.raise_for_status()
        entries = parse_awesome_list(resp.text)
        return entries[:limit]
```

**Step 4: 运行测试，确认通过**

Run: `cd /Users/zekunmac/_HUB_LOCAL/AgentStore && uv run pytest tests/test_discover_mcp.py -v`
Expected: ALL PASS

**Step 5: 提交**

```bash
git add scripts/discover_mcp.py tests/test_discover_mcp.py
git commit -m "feat: MCP plugin discovery (ported from AgentRating)"
```

---

## Task 6: 数据管线编排

**Files:**
- Create: `scripts/pipeline.py`
- Create: `tests/test_pipeline.py`

**Step 1: 写失败测试**

```python
# tests/test_pipeline.py
"""管线编排测试"""
import pytest
from scripts.pipeline import assemble_output


class TestAssembleOutput:
    def test_assembles_capability_json(self):
        from scripts.models import CapabilityEntry, RepoData, AnalysisResult, Scores
        entry = CapabilityEntry(
            name="test", source="openclaw", source_id="t1",
            provider="user", description="desc", category="dev",
            repo_url="https://github.com/user/test", protocol="openclaw",
        )
        repo = RepoData(stars=100, forks=10)
        analysis = AnalysisResult(summary="Good", one_liner="Test tool")
        scores = Scores(reliability=7.0, safety=8.0, capability=6.5,
                       reputation=5.0, usability=7.5, overall=7.0)

        result = assemble_output(entry, repo, analysis, scores)
        assert result["slug"] == "openclaw-t1"
        assert result["name"] == "test"
        assert result["scores"]["reliability"] == 7.0
        assert result["overall_score"] == 7.0
        assert result["source"] == "openclaw"
```

**Step 2: 运行测试，确认失败**

Run: `cd /Users/zekunmac/_HUB_LOCAL/AgentStore && uv run pytest tests/test_pipeline.py -v`
Expected: FAIL

**Step 3: 实现管线**

```python
# scripts/pipeline.py
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
    """组装单个能力的 JSON 输出"""
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
        # GitHub 数据
        "stars": repo.stars,
        "forks": repo.forks,
        "language": repo.language,
        "last_updated": repo.last_updated,
        "contributors": repo.contributors,
        "has_tests": repo.has_tests,
        "has_typescript": repo.has_typescript,
        "readme_length": repo.readme_length,
        # 评分
        "scores": {
            "reliability": scores.reliability,
            "safety": scores.safety,
            "capability": scores.capability,
            "reputation": scores.reputation,
            "usability": scores.usability,
        },
        "overall_score": scores.overall,
        # AI 分析
        "ai_summary": analysis.summary,
        "one_liner": analysis.one_liner,
        "install_guide": analysis.install_guide,
        "usage_guide": analysis.usage_guide,
        "safety_notes": analysis.safety_notes,
    }


async def run_pipeline(
    openclaw_limit: int = 100,
    mcp_limit: int = 100,
) -> list[dict]:
    """运行完整管线"""
    token = os.getenv("GITHUB_TOKEN", "")
    provider = os.getenv("AI_PROVIDER", "openai")

    # [1/5] 发现能力
    print("[1/5] 发现 Agent 能力...")
    openclaw_entries, mcp_entries = await asyncio.gather(
        discover_openclaw_skills(limit=openclaw_limit),
        discover_mcp_plugins(limit=mcp_limit),
    )
    all_entries = openclaw_entries + mcp_entries
    print(f"  发现 {len(openclaw_entries)} 个 OpenClaw skills + {len(mcp_entries)} 个 MCP plugins")

    # [2/5] 采集 GitHub 数据
    print("[2/5] 采集 GitHub 数据...")
    all_repos = await collect_repo_data(all_entries, token=token)

    # [3/5] AI 分析
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

    # [4/5] 评分
    print("[4/5] 计算评分...")
    data_list = [
        CapabilityData(entry=e, repo=r, analysis=a)
        for e, r, a in zip(all_entries, all_repos, all_analyses)
    ]
    all_scores = calculate_scores(data_list)

    # [5/5] 组装输出
    print("[5/5] 生成输出...")
    results = [
        assemble_output(e, r, a, s)
        for e, r, a, s in zip(all_entries, all_repos, all_analyses, all_scores)
    ]
    results.sort(key=lambda x: x["overall_score"], reverse=True)

    # 写入文件
    out_dir = Path(__file__).parent.parent / "data"
    out_dir.mkdir(exist_ok=True)
    out_file = out_dir / "capabilities.json"
    out_file.write_text(json.dumps(results, ensure_ascii=False, indent=2))

    # 复制到 web/data/
    web_data = Path(__file__).parent.parent / "web" / "data"
    web_data.mkdir(parents=True, exist_ok=True)
    (web_data / "capabilities.json").write_text(json.dumps(results, ensure_ascii=False, indent=2))

    print(f"完成！共 {len(results)} 个能力，已输出到 {out_file}")
    return results


if __name__ == "__main__":
    asyncio.run(run_pipeline())
```

**Step 4: 运行测试，确认通过**

Run: `cd /Users/zekunmac/_HUB_LOCAL/AgentStore && uv run pytest tests/test_pipeline.py -v`
Expected: ALL PASS

**Step 5: 提交**

```bash
git add scripts/pipeline.py tests/test_pipeline.py
git commit -m "feat: full data pipeline (discover → collect → analyze → score → output)"
```

---

## Task 7: FastAPI REST API

**Files:**
- Create: `api/__init__.py`
- Create: `api/main.py`
- Create: `api/database.py`
- Create: `tests/test_api.py`

**Step 1: 写失败测试**

```python
# tests/test_api.py
"""API 端点测试"""
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path):
    """创建测试客户端，使用临时数据库"""
    import os
    os.environ["DATABASE_PATH"] = str(tmp_path / "test.db")
    from api.main import app
    from api.database import init_db, insert_capabilities
    init_db()
    # 插入测试数据
    insert_capabilities([
        {
            "slug": "test-1", "name": "Trading Bot", "source": "openclaw",
            "source_id": "trade-1", "provider": "trader", "description": "Auto trading",
            "category": "trading", "repo_url": "https://github.com/t/t",
            "endpoint": None, "protocol": "openclaw",
            "stars": 500, "forks": 50, "language": "Python",
            "last_updated": "2026-02-15", "contributors": 5,
            "has_tests": True, "has_typescript": False, "readme_length": 2000,
            "scores": {"reliability": 8.0, "safety": 7.5, "capability": 7.0,
                       "reputation": 6.0, "usability": 8.0},
            "overall_score": 7.4,
            "ai_summary": "Good trading bot", "one_liner": "Auto trader",
            "install_guide": "pip install", "usage_guide": "Run it",
            "safety_notes": "Safe",
        },
        {
            "slug": "test-2", "name": "Writer AI", "source": "mcp",
            "source_id": "write-1", "provider": "writer", "description": "AI writing",
            "category": "writing", "repo_url": "https://github.com/w/w",
            "endpoint": None, "protocol": "mcp",
            "stars": 200, "forks": 20, "language": "TypeScript",
            "last_updated": "2026-02-10", "contributors": 3,
            "has_tests": False, "has_typescript": True, "readme_length": 1000,
            "scores": {"reliability": 6.0, "safety": 8.0, "capability": 5.5,
                       "reputation": 4.0, "usability": 6.5},
            "overall_score": 6.2,
            "ai_summary": "Writing assistant", "one_liner": "AI writer",
            "install_guide": "npm install", "usage_guide": "Use it",
            "safety_notes": "OK",
        },
    ])
    return TestClient(app)


class TestSearch:
    def test_search_by_query(self, client):
        resp = client.get("/api/v1/search", params={"q": "trading"})
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["results"]) >= 1
        assert data["results"][0]["name"] == "Trading Bot"

    def test_search_by_category(self, client):
        resp = client.get("/api/v1/search", params={"category": "writing"})
        assert resp.status_code == 200
        assert len(resp.json()["results"]) == 1


class TestCapability:
    def test_get_by_id(self, client):
        resp = client.get("/api/v1/capabilities/test-1")
        assert resp.status_code == 200
        assert resp.json()["name"] == "Trading Bot"

    def test_not_found(self, client):
        resp = client.get("/api/v1/capabilities/nonexistent")
        assert resp.status_code == 404


class TestCategories:
    def test_list_categories(self, client):
        resp = client.get("/api/v1/categories")
        assert resp.status_code == 200
        cats = resp.json()["categories"]
        assert "trading" in cats
        assert "writing" in cats


class TestRankings:
    def test_rankings_sorted(self, client):
        resp = client.get("/api/v1/rankings")
        assert resp.status_code == 200
        results = resp.json()["results"]
        assert results[0]["overall_score"] >= results[1]["overall_score"]
```

**Step 2: 运行测试，确认失败**

Run: `cd /Users/zekunmac/_HUB_LOCAL/AgentStore && uv run pytest tests/test_api.py -v`
Expected: FAIL

**Step 3: 实现数据库层**

```python
# api/__init__.py
```

```python
# api/database.py
"""SQLite 数据库层"""
import json
import os
import sqlite3
from pathlib import Path

_DB_PATH = os.getenv("DATABASE_PATH", str(Path(__file__).parent.parent / "data" / "agentstore.db"))


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """初始化数据库表"""
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
    conn.commit()
    conn.close()


def insert_capabilities(items: list[dict]):
    """批量插入/更新能力数据"""
    conn = _get_conn()
    for item in items:
        scores = item.get("scores", {})
        conn.execute("""
            INSERT OR REPLACE INTO capabilities
            (slug, name, source, source_id, provider, description, category,
             repo_url, endpoint, protocol, stars, forks, language, last_updated,
             contributors, has_tests, has_typescript, readme_length,
             reliability, safety, capability, reputation, usability, overall_score,
             ai_summary, one_liner, install_guide, usage_guide, safety_notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            item.get("ai_summary", ""), item.get("one_liner", ""),
            item.get("install_guide", ""), item.get("usage_guide", ""),
            item.get("safety_notes", ""),
        ))
    conn.commit()
    conn.close()


def search_capabilities(q: str = "", category: str = "", limit: int = 20) -> list[dict]:
    """搜索能力"""
    conn = _get_conn()
    conditions = []
    params = []
    if q:
        conditions.append("(name LIKE ? OR description LIKE ?)")
        params.extend([f"%{q}%", f"%{q}%"])
    if category:
        conditions.append("category = ?")
        params.append(category)

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    rows = conn.execute(
        f"SELECT * FROM capabilities {where} ORDER BY overall_score DESC LIMIT ?",
        params + [limit]
    ).fetchall()
    conn.close()
    return [_row_to_dict(r) for r in rows]


def get_capability(slug: str) -> dict | None:
    """获取单个能力"""
    conn = _get_conn()
    row = conn.execute("SELECT * FROM capabilities WHERE slug = ?", (slug,)).fetchone()
    conn.close()
    return _row_to_dict(row) if row else None


def get_categories() -> list[str]:
    """获取所有分类"""
    conn = _get_conn()
    rows = conn.execute("SELECT DISTINCT category FROM capabilities ORDER BY category").fetchall()
    conn.close()
    return [r["category"] for r in rows if r["category"]]


def _row_to_dict(row: sqlite3.Row) -> dict:
    """Row 转 dict，重组 scores 结构"""
    d = dict(row)
    d["scores"] = {
        "reliability": d.pop("reliability", 0),
        "safety": d.pop("safety", 0),
        "capability": d.pop("capability", 0),
        "reputation": d.pop("reputation", 0),
        "usability": d.pop("usability", 0),
    }
    return d
```

**Step 4: 实现 FastAPI 应用**

```python
# api/main.py
"""AgentStore REST API"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .database import search_capabilities, get_capability, get_categories, init_db

app = FastAPI(
    title="AgentStore API",
    description="Agent 能力注册表 + 信誉系统",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()


@app.get("/api/v1/search")
def api_search(q: str = "", category: str = "", limit: int = 20):
    results = search_capabilities(q=q, category=category, limit=limit)
    return {"results": results, "total": len(results)}


@app.get("/api/v1/capabilities/{slug}")
def api_get_capability(slug: str):
    cap = get_capability(slug)
    if not cap:
        raise HTTPException(status_code=404, detail="Capability not found")
    return cap


@app.get("/api/v1/capabilities/{slug}/scores")
def api_get_scores(slug: str):
    cap = get_capability(slug)
    if not cap:
        raise HTTPException(status_code=404, detail="Capability not found")
    return {"slug": slug, "scores": cap["scores"], "overall_score": cap["overall_score"]}


@app.get("/api/v1/categories")
def api_categories():
    return {"categories": get_categories()}


@app.get("/api/v1/rankings")
def api_rankings(category: str = "", sort: str = "overall_score", limit: int = 50):
    results = search_capabilities(category=category, limit=limit)
    return {"results": results, "total": len(results)}
```

**Step 5: 运行测试，确认通过**

Run: `cd /Users/zekunmac/_HUB_LOCAL/AgentStore && uv run pytest tests/test_api.py -v`
Expected: ALL PASS

**Step 6: 提交**

```bash
git add api/ tests/test_api.py
git commit -m "feat: FastAPI REST API with SQLite backend"
```

---

## Task 8: Next.js 前端骨架

**说明：** 此任务从 AgentRating 复制前端框架，修改数据模型和页面。由于前端代码量大，这里列出关键文件和修改点，实际执行时参考 AgentRating 的 `web/` 目录。

**Files:**
- Create: `web/` (从 AgentRating 复制基础结构)
- Modify: `web/src/lib/types.ts` (新数据模型)
- Modify: `web/src/lib/data.ts` (新数据加载)
- Modify: `web/src/app/page.tsx` (首页适配)

**Step 1: 初始化 Next.js 项目**

```bash
cd /Users/zekunmac/_HUB_LOCAL/AgentStore
npx create-next-app@latest web --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"
```

**Step 2: 创建类型定义 `web/src/lib/types.ts`**

```typescript
export interface CapabilityScores {
  reliability: number;
  safety: number;
  capability: number;
  reputation: number;
  usability: number;
}

export interface Capability {
  slug: string;
  name: string;
  source: "openclaw" | "mcp";
  source_id: string;
  provider: string;
  description: string;
  category: string;
  repo_url: string | null;
  endpoint: string | null;
  protocol: "rest" | "mcp" | "openclaw";
  stars: number;
  forks: number;
  language: string | null;
  last_updated: string;
  contributors: number;
  has_tests: boolean;
  has_typescript: boolean;
  readme_length: number;
  scores: CapabilityScores;
  overall_score: number;
  ai_summary: string;
  one_liner: string;
  install_guide: string;
  usage_guide: string;
  safety_notes: string;
}

export const CATEGORIES: Record<string, string> = {
  "development": "Development",
  "data": "Data & Database",
  "web": "Web & Search",
  "productivity": "Productivity",
  "ai": "AI & LLM",
  "media": "Design & Media",
  "trading": "Trading & Finance",
  "communication": "Communication",
};

export const SCORE_LABELS: Record<keyof CapabilityScores, string> = {
  reliability: "可靠性",
  safety: "安全性",
  capability: "能力范围",
  reputation: "社区口碑",
  usability: "易用性",
};
```

**Step 3: 创建数据加载层 `web/src/lib/data.ts`**

```typescript
import fs from "fs";
import path from "path";
import { Capability } from "./types";

let _cache: Capability[] | null = null;

function loadCapabilities(): Capability[] {
  const candidates = [
    path.join(process.cwd(), "data", "capabilities.json"),
    path.join(process.cwd(), "..", "data", "capabilities.json"),
  ];
  const filePath = candidates.find((p) => fs.existsSync(p));
  if (!filePath) return [];
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as Capability[];
}

function getCapabilities(): Capability[] {
  if (!_cache) _cache = loadCapabilities();
  return _cache;
}

export function getAllCapabilities(): Capability[] {
  return getCapabilities();
}

export function getCapabilityBySlug(slug: string): Capability | undefined {
  return getCapabilities().find((c) => c.slug === slug);
}

export function getCapabilitiesByCategory(category: string): Capability[] {
  return getCapabilities().filter((c) => c.category === category);
}

export function getCategories(): string[] {
  return [...new Set(getCapabilities().map((c) => c.category))].sort();
}

export function getTopCapabilities(limit = 10): Capability[] {
  return getCapabilities().slice(0, limit);
}
```

**Step 4: 提交**

```bash
git add web/
git commit -m "feat: Next.js frontend scaffold with AgentStore types"
```

---

## Task 9: 前端核心页面

**Files:**
- Modify: `web/src/app/page.tsx` (首页)
- Create: `web/src/app/capability/[slug]/page.tsx` (详情页)
- Create: `web/src/app/category/[slug]/page.tsx` (分类页)
- Create: `web/src/components/RadarChart.tsx` (雷达图)
- Create: `web/src/components/ScoreBadge.tsx` (评分徽章)

**说明：** 此任务涉及大量前端 UI 代码。执行时应参考 AgentRating 的 `web/src/` 目录复用组件，核心改动是数据模型从 Plugin → Capability，评分从 5 维（人气/维护/社区/文档/代码质量）→ 新 5 维（可靠性/安全性/能力范围/口碑/易用性）。

雷达图组件从 AgentRating 复制，修改维度标签即可。

**Step 1: 实现雷达图、首页、详情页、分类页**

（参考 AgentRating web/src/ 的对应文件，替换类型和维度）

**Step 2: 本地验证**

```bash
cd /Users/zekunmac/_HUB_LOCAL/AgentStore/web && npm run dev
```

打开 http://localhost:3000 确认页面可访问。

**Step 3: 提交**

```bash
git add web/src/
git commit -m "feat: core frontend pages (home, detail, category, radar chart)"
```

---

## Task 10: 集成测试和启动脚本

**Files:**
- Create: `scripts/start.sh`
- Create: `scripts/seed_db.py`

**Step 1: 创建数据库种子脚本**

```python
# scripts/seed_db.py
"""从 capabilities.json 导入数据到 SQLite"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from api.database import init_db, insert_capabilities


def seed():
    data_file = Path(__file__).parent.parent / "data" / "capabilities.json"
    if not data_file.exists():
        print("data/capabilities.json 不存在，请先运行 pipeline")
        return
    items = json.loads(data_file.read_text())
    init_db()
    insert_capabilities(items)
    print(f"已导入 {len(items)} 条能力数据")


if __name__ == "__main__":
    seed()
```

**Step 2: 创建一键启动脚本**

```bash
#!/bin/bash
# scripts/start.sh — AgentStore 一键启动
set -e

PROJECT_DIR="/Users/zekunmac/_HUB_LOCAL/AgentStore"
cd "$PROJECT_DIR"

echo "=== AgentStore 启动 ==="

# 启动 API 服务
echo "[1/2] 启动 FastAPI API (port 8002)..."
uv run uvicorn api.main:app --host 0.0.0.0 --port 8002 --reload &
API_PID=$!

# 启动前端
echo "[2/2] 启动 Next.js 前端 (port 3002)..."
cd web && npm run dev -- -p 3002 &
FRONT_PID=$!

echo ""
echo "=== AgentStore 已启动 ==="
echo "API:    http://localhost:8002/docs"
echo "前端:   http://localhost:3002"
echo ""
echo "按 Ctrl+C 停止所有服务"

trap "kill $API_PID $FRONT_PID 2>/dev/null" EXIT
wait
```

**Step 3: 赋予执行权限并验证**

```bash
chmod +x /Users/zekunmac/_HUB_LOCAL/AgentStore/scripts/start.sh
```

**Step 4: 提交**

```bash
git add scripts/start.sh scripts/seed_db.py
git commit -m "feat: startup script and database seeder"
```

---

## 执行顺序总结

| Task | 内容 | 预计时间 | 依赖 |
|------|------|---------|------|
| 1 | 项目骨架和依赖 | 5 min | 无 |
| 2 | 评分引擎（TDD） | 15 min | Task 1 |
| 3 | AI 分析引擎 | 15 min | Task 1 |
| 4 | OpenClaw 采集器 | 10 min | Task 1 |
| 5 | MCP 数据源 | 10 min | Task 1 |
| 6 | 数据管线编排 | 10 min | Task 2-5 |
| 7 | FastAPI REST API | 15 min | Task 1 |
| 8 | Next.js 前端骨架 | 10 min | 无 |
| 9 | 前端核心页面 | 20 min | Task 8 |
| 10 | 集成和启动脚本 | 5 min | Task 6-7 |

**可并行的任务：**
- Task 2, 3, 4, 5 可以并行（都只依赖 Task 1）
- Task 7 和 Task 8 可以并行（无依赖关系）
