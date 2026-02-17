"""Pydantic 响应模型 — 用于 Swagger 自动文档生成"""
from __future__ import annotations

from pydantic import BaseModel, Field


# ── 通用子模型 ──────────────────────────────────────────────

class ScoresDetail(BaseModel):
    """五维评分详情"""
    reliability: float = Field(0, description="可靠性评分 (0-10)")
    safety: float = Field(0, description="安全性评分 (0-10)")
    capability: float = Field(0, description="能力评分 (0-10)")
    reputation: float = Field(0, description="声誉评分 (0-10)")
    usability: float = Field(0, description="易用性评分 (0-10)")


class CapabilityItem(BaseModel):
    """单个 Agent 能力的完整数据结构"""
    slug: str = Field(..., description="唯一标识符，如 'modelcontextprotocol-servers'")
    name: str = Field(..., description="能力名称")
    source: str = Field(..., description="数据来源，如 'github'")
    source_id: str = Field(..., description="来源平台 ID")
    provider: str = Field(..., description="提供者/作者")
    description: str | None = Field(None, description="功能描述")
    category: str | None = Field(None, description="分类，如 'coding', 'data' 等")
    repo_url: str | None = Field(None, description="GitHub 仓库地址")
    endpoint: str | None = Field(None, description="API 端点地址")
    protocol: str = Field("rest", description="协议类型：rest / mcp / grpc")
    stars: int = Field(0, description="GitHub Star 数")
    forks: int = Field(0, description="GitHub Fork 数")
    language: str | None = Field(None, description="主要编程语言")
    last_updated: str | None = Field(None, description="最后更新时间 (ISO 格式)")
    contributors: int = Field(0, description="贡献者数量")
    has_tests: bool = Field(False, description="是否包含测试")
    has_typescript: bool = Field(False, description="是否使用 TypeScript")
    readme_length: int = Field(0, description="README 长度 (字符数)")
    overall_score: float = Field(0, description="综合评分 (0-10)")
    scores: ScoresDetail = Field(default_factory=ScoresDetail, description="五维评分详情")
    ai_summary: str | None = Field(None, description="AI 生成的功能摘要")
    one_liner: str | None = Field(None, description="一句话介绍")
    install_guide: str | None = Field(None, description="安装指南")
    usage_guide: str | None = Field(None, description="使用指南")
    safety_notes: str | None = Field(None, description="安全注意事项")
    created_at: str | None = Field(None, description="入库时间")
    updated_at: str | None = Field(None, description="更新时间")

    model_config = {"from_attributes": True}


class SemanticCapabilityItem(CapabilityItem):
    """语义搜索结果项，额外包含相似度分数"""
    similarity: float = Field(0, description="与查询的语义相似度 (0-1)")


# ── 端点响应模型 ─────────────────────────────────────────────

class SearchResponse(BaseModel):
    """搜索结果响应"""
    results: list[CapabilityItem] = Field(..., description="搜索结果列表")
    total: int = Field(..., description="匹配总数")
    page: int = Field(..., description="当前页码")
    per_page: int = Field(..., description="每页数量")
    total_pages: int = Field(..., description="总页数")


class CapabilityResponse(CapabilityItem):
    """单个能力详情响应（继承完整数据结构）"""
    pass


class ScoresResponse(BaseModel):
    """评分查询响应"""
    slug: str = Field(..., description="能力唯一标识符")
    scores: ScoresDetail = Field(..., description="五维评分详情")
    overall_score: float = Field(..., description="综合评分 (0-10)")


class CategoriesResponse(BaseModel):
    """分类列表响应"""
    categories: list[str] = Field(..., description="所有可用分类名称列表")


class RankingsResponse(BaseModel):
    """排行榜响应"""
    results: list[CapabilityItem] = Field(..., description="排行榜列表")
    total: int = Field(..., description="匹配总数")


class SemanticSearchResponse(BaseModel):
    """语义搜索响应"""
    results: list[SemanticCapabilityItem] = Field(..., description="语义匹配结果，按相似度降序")
    total: int = Field(..., description="结果数量")
    query: str = Field(..., description="原始查询文本")


class StatsResponse(BaseModel):
    """平台统计响应"""
    total: int = Field(..., description="能力总数")
    categories: dict[str, int] = Field(..., description="各分类数量，key 为分类名")
    avg_score: float = Field(..., description="全平台平均综合评分")
    top_capability: CapabilityItem | None = Field(None, description="综合评分最高的能力")


class ErrorResponse(BaseModel):
    """错误响应"""
    detail: str = Field(..., description="错误描述信息")
