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
    reliability_score: float = 0.0
    safety_score: float = 0.0
    capability_score: float = 0.0
    usability_score: float = 0.0
    summary: str = ""
    one_liner: str = ""
    install_guide: str = ""
    usage_guide: str = ""
    safety_notes: str = ""
    category_suggestion: str = ""


@dataclass
class Scores:
    """5 维评分结果"""
    reliability: float = 0.0
    safety: float = 0.0
    capability: float = 0.0
    reputation: float = 0.0
    usability: float = 0.0
    overall: float = 0.0


@dataclass
class CapabilityData:
    """评分引擎的输入（组合 RepoData + AnalysisResult）"""
    entry: CapabilityEntry
    repo: RepoData = field(default_factory=RepoData)
    analysis: AnalysisResult = field(default_factory=AnalysisResult)
