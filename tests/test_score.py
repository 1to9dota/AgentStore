"""评分引擎测试"""
import pytest
from scripts.models import CapabilityEntry, CapabilityData, RepoData, AnalysisResult, Scores
from scripts.score import calculate_scores, _score_reliability, _score_safety, _score_capability, _score_reputation, _score_usability


def _make_data(**overrides) -> CapabilityData:
    """测试用工厂方法"""
    entry = CapabilityEntry(
        name="test-skill", source="openclaw", source_id="test-1",
        provider="testuser", description="A test capability", category="development",
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
        expected = round(
            s.reliability * 0.25 + s.safety * 0.25 +
            s.capability * 0.20 + s.reputation * 0.15 +
            s.usability * 0.15, 1
        )
        assert s.overall == expected

    def test_empty_list(self):
        assert calculate_scores([]) == []
