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
        raw = '{"reliability_score": 7.5, "safety_score": 8.0, "capability_score": 6.5, "usability_score": 7.0, "summary": "A good tool", "one_liner": "Test tool", "install_guide": "pip install test", "usage_guide": "Use it like this", "safety_notes": "No known issues", "category_suggestion": "development"}'
        result = analyzer.parse_response(raw)
        assert isinstance(result, AnalysisResult)
        assert result.reliability_score == 7.5
        assert result.safety_score == 8.0

    def test_malformed_json_returns_defaults(self):
        analyzer = create_analyzer(provider="openai", api_key="test-key")
        result = analyzer.parse_response("not json")
        assert isinstance(result, AnalysisResult)
        assert result.reliability_score == 0.0

    def test_json_in_code_block(self):
        analyzer = create_analyzer(provider="openai", api_key="test-key")
        raw = '```json\n{"reliability_score": 5.0, "safety_score": 5.0, "capability_score": 5.0, "usability_score": 5.0, "summary": "OK", "one_liner": "Tool", "install_guide": "", "usage_guide": "", "safety_notes": "", "category_suggestion": "ai"}\n```'
        result = analyzer.parse_response(raw)
        assert result.reliability_score == 5.0
