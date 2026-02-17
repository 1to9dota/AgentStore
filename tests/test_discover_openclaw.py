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
        raw = {"skills": [{"id": "bad"}]}
        entries = parse_clawhub_response(raw)
        assert entries == []
