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
    return _clamp(ai_part + maint * 0.3)


def _score_safety(data: CapabilityData) -> float:
    """安全性评分

    有扫描结果时：扫描结果 60% + AI 分析 40%
    无扫描结果时：保持原来的纯 AI 评分（85% AI + 15% 代码指标）
    """
    scan = data.scan

    # 判断是否有有效的扫描结果（tool 不为空说明至少有一个扫描器跑过）
    has_scan = bool(scan.tool)

    if has_scan:
        # ---- 扫描分（60%）----
        scan_score = 10.0
        scan_score -= scan.severity_high * 2.0    # 每个高危 -2 分
        scan_score -= scan.severity_medium * 1.0  # 每个中危 -1 分
        scan_score -= scan.severity_low * 0.3     # 每个低危 -0.3 分
        if scan.has_api_keys:
            scan_score -= 3.0                     # 检测到 API key 泄露 -3 分
        scan_score = _clamp(scan_score)

        # ---- AI 分（40%）----
        ai_score = data.analysis.safety_score

        return _clamp(scan_score * 0.6 + ai_score * 0.4)
    else:
        # 无扫描结果，退化为纯 AI 评分
        ai_part = data.analysis.safety_score * 0.85
        code_bonus = 0.0
        if data.repo.has_tests:
            code_bonus += 1.0
        if data.repo.has_typescript:
            code_bonus += 0.5
        return _clamp(ai_part + code_bonus)


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
    return _clamp(ai_part + maturity)


def _score_reputation(data: CapabilityData) -> float:
    """社区口碑 = star (40%) + issue 关闭率 (30%) + 贡献者 (30%)"""
    star_score = min(10.0, math.log(max(data.repo.stars, 1) / 50 + 1) / math.log(200) * 10)
    total_issues = data.repo.open_issues + data.repo.closed_issues
    if total_issues > 0:
        issue_score = (data.repo.closed_issues / total_issues) * 10.0
    else:
        issue_score = 5.0
    contrib_score = min(10.0, math.log(max(data.repo.contributors, 1) + 1) / math.log(20) * 10)
    return _clamp(star_score * 0.4 + issue_score * 0.3 + contrib_score * 0.3)


def _score_usability(data: CapabilityData) -> float:
    """易用性 = AI 评估 (75%) + 文档长度 (25%)
    README 太短（< 100 字符）直接判 0 分，文档质量不达标"""
    if data.repo.readme_length < 100:
        return 0.0
    ai_part = data.analysis.usability_score * 0.75
    doc_score = min(2.5, data.repo.readme_length / 3000 * 2.5)
    return _clamp(ai_part + doc_score)


def calculate_scores(data_list: list[CapabilityData]) -> list[Scores]:
    results = []
    for data in data_list:
        r = round(_score_reliability(data), 1)
        s = round(_score_safety(data), 1)
        c = round(_score_capability(data), 1)
        rep = round(_score_reputation(data), 1)
        u = round(_score_usability(data), 1)
        overall = round(r * 0.25 + s * 0.25 + c * 0.20 + rep * 0.15 + u * 0.15, 1)
        results.append(Scores(
            reliability=r, safety=s, capability=c,
            reputation=rep, usability=u, overall=overall,
        ))
    return results
