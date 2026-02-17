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
