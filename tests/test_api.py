"""API 端点测试"""
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path):
    import os
    os.environ["DATABASE_PATH"] = str(tmp_path / "test.db")
    # Force reimport to pick up new env var
    import importlib
    import api.database as db_mod
    importlib.reload(db_mod)
    from api.main import app
    from api.database import init_db, insert_capabilities
    init_db()
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
