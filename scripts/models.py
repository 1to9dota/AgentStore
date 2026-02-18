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
    dependencies: list[str] = field(default_factory=list)  # 主要依赖包名
    latest_version: str = ""  # 最新版本号
    supported_clients: list[str] = field(default_factory=list)  # 兼容的客户端


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
class ScanResult:
    """安全扫描结果"""
    tool: str = ""                    # 扫描工具名
    vulnerabilities: int = 0          # 漏洞数量
    severity_high: int = 0            # 高危数量
    severity_medium: int = 0          # 中危数量
    severity_low: int = 0             # 低危数量
    permissions: list = field(default_factory=list)  # 检测到的权限列表
    has_api_keys: bool = False        # 是否检测到泄露的 API key
    details: str = ""                 # 详细报告文本


@dataclass
class CapabilityData:
    """评分引擎的输入（组合 RepoData + AnalysisResult）"""
    entry: CapabilityEntry
    repo: RepoData = field(default_factory=RepoData)
    analysis: AnalysisResult = field(default_factory=AnalysisResult)
    scan: ScanResult = field(default_factory=ScanResult)
