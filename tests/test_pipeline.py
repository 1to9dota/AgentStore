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
