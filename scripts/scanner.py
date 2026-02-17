"""AgentStore 安全扫描模块

提供 3 个扫描器：
- SemgrepScanner: 代码安全漏洞扫描（需要 semgrep）
- TrivyScanner: 依赖漏洞扫描（需要 trivy）
- SecretScanner: API Key 泄露检测（纯 Python，无外部依赖）

所有外部工具都做优雅降级：未安装则跳过，返回空结果。
"""
import asyncio
import json
import os
import re
import shutil
from abc import ABC, abstractmethod
from pathlib import Path

from .models import ScanResult


# ---------------------------------------------------------------------------
# 抽象基类
# ---------------------------------------------------------------------------

class Scanner(ABC):
    """扫描器抽象基类"""

    @abstractmethod
    async def scan(self, repo_path: str) -> ScanResult:
        """对指定仓库路径执行扫描，返回 ScanResult"""
        ...


# ---------------------------------------------------------------------------
# SemgrepScanner — 代码安全漏洞扫描
# ---------------------------------------------------------------------------

class SemgrepScanner(Scanner):
    """使用 semgrep 进行静态代码安全扫描"""

    # 权限相关的代码模式（用于检测权限请求）
    PERMISSION_PATTERNS = {
        "filesystem": [
            r"\bopen\s*\(", r"\bos\.path\b", r"\bos\.listdir\b",
            r"\bos\.remove\b", r"\bos\.mkdir\b", r"\bshutil\b",
            r"\bfs\.\w+Sync\b", r"\bfs\.promises\b", r"\breadFileSync\b",
            r"\bwriteFileSync\b",
        ],
        "network": [
            r"\brequests\.\w+\b", r"\bhttpx\.\w+\b", r"\burllib\b",
            r"\baiohttp\b", r"\bfetch\s*\(", r"\baxios\b",
            r"\bsocket\b", r"\bhttp\.get\b", r"\bhttp\.request\b",
        ],
        "env_vars": [
            r"\bos\.environ\b", r"\bos\.getenv\b",
            r"\bprocess\.env\b", r"\bdotenv\b",
        ],
        "subprocess": [
            r"\bsubprocess\b", r"\bos\.system\b", r"\bos\.popen\b",
            r"\bexec\s*\(", r"\beval\s*\(", r"\bchild_process\b",
            r"\bspawn\s*\(", r"\bexecSync\b",
        ],
    }

    async def scan(self, repo_path: str) -> ScanResult:
        # 检测 semgrep 是否安装
        if not shutil.which("semgrep"):
            return ScanResult(tool="semgrep", details="semgrep 未安装，已跳过")

        try:
            proc = await asyncio.create_subprocess_exec(
                "semgrep", "scan", "--config", "auto", "--json", repo_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=120)
            output = json.loads(stdout.decode("utf-8", errors="replace"))
        except asyncio.TimeoutError:
            return ScanResult(tool="semgrep", details="semgrep 扫描超时")
        except (json.JSONDecodeError, Exception) as e:
            return ScanResult(tool="semgrep", details=f"semgrep 解析失败: {e}")

        # 统计漏洞严重程度
        high = medium = low = 0
        results_list = output.get("results", [])
        for finding in results_list:
            severity = finding.get("extra", {}).get("severity", "").upper()
            if severity in ("ERROR", "HIGH", "CRITICAL"):
                high += 1
            elif severity in ("WARNING", "MEDIUM"):
                medium += 1
            elif severity in ("INFO", "LOW"):
                low += 1

        # 检测权限相关代码
        permissions = self._detect_permissions(repo_path)

        total = high + medium + low
        return ScanResult(
            tool="semgrep",
            vulnerabilities=total,
            severity_high=high,
            severity_medium=medium,
            severity_low=low,
            permissions=permissions,
            has_api_keys=False,  # API key 检测交给 SecretScanner
            details=f"semgrep 发现 {total} 个问题 (high={high}, medium={medium}, low={low})",
        )

    def _detect_permissions(self, repo_path: str) -> list[str]:
        """扫描代码文件，检测使用了哪些权限类别"""
        detected = set()
        code_extensions = {".py", ".js", ".ts", ".jsx", ".tsx", ".go", ".rs"}

        for root, _dirs, files in os.walk(repo_path):
            # 跳过 node_modules / .git 等
            if any(skip in root for skip in ["node_modules", ".git", "__pycache__", "venv"]):
                continue
            for fname in files:
                if Path(fname).suffix not in code_extensions:
                    continue
                fpath = os.path.join(root, fname)
                try:
                    content = Path(fpath).read_text(errors="ignore")
                except OSError:
                    continue
                for perm_name, patterns in self.PERMISSION_PATTERNS.items():
                    if perm_name in detected:
                        continue
                    for pat in patterns:
                        if re.search(pat, content):
                            detected.add(perm_name)
                            break

        return sorted(detected)


# ---------------------------------------------------------------------------
# TrivyScanner — 依赖漏洞扫描
# ---------------------------------------------------------------------------

class TrivyScanner(Scanner):
    """使用 trivy 扫描依赖漏洞"""

    async def scan(self, repo_path: str) -> ScanResult:
        if not shutil.which("trivy"):
            return ScanResult(tool="trivy", details="trivy 未安装，已跳过")

        try:
            proc = await asyncio.create_subprocess_exec(
                "trivy", "fs", "--format", "json", repo_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=120)
            output = json.loads(stdout.decode("utf-8", errors="replace"))
        except asyncio.TimeoutError:
            return ScanResult(tool="trivy", details="trivy 扫描超时")
        except (json.JSONDecodeError, Exception) as e:
            return ScanResult(tool="trivy", details=f"trivy 解析失败: {e}")

        # 解析 trivy JSON 输出
        high = medium = low = 0
        results_list = output.get("Results", [])
        for target in results_list:
            for vuln in target.get("Vulnerabilities", []):
                severity = vuln.get("Severity", "").upper()
                if severity in ("CRITICAL", "HIGH"):
                    high += 1
                elif severity == "MEDIUM":
                    medium += 1
                elif severity in ("LOW", "UNKNOWN"):
                    low += 1

        total = high + medium + low
        return ScanResult(
            tool="trivy",
            vulnerabilities=total,
            severity_high=high,
            severity_medium=medium,
            severity_low=low,
            details=f"trivy 发现 {total} 个 CVE (high={high}, medium={medium}, low={low})",
        )


# ---------------------------------------------------------------------------
# SecretScanner — API Key 泄露检测（纯 Python）
# ---------------------------------------------------------------------------

class SecretScanner(Scanner):
    """纯 Python 实现的 API Key / Secret 泄露检测"""

    # 常见 API Key 模式
    SECRET_PATTERNS = [
        (r"sk-[a-zA-Z0-9]{20,}", "OpenAI API Key"),
        (r"ghp_[a-zA-Z0-9]{36}", "GitHub Personal Access Token"),
        (r"AKIA[A-Z0-9]{16}", "AWS Access Key ID"),
        (r"AIza[a-zA-Z0-9_-]{35}", "Google API Key"),
        (r"xox[bpas]-[a-zA-Z0-9-]{10,}", "Slack Token"),
    ]

    # 假值/占位符 — 匹配到这些说明不是真正泄露
    DUMMY_VALUES = re.compile(
        r"(test|fake|dummy|example|placeholder|xxx|your[_-]|changeme|replace|TODO|"
        r"sk-xxx|sk-your|sk-test|INSERT|REPLACE_ME|<[^>]+>|\$\{|process\.env|os\.getenv|"
        r"\.{3,}|0{8,}|1{8,}|a{8,}|x{8,})",
        re.IGNORECASE,
    )

    # 需要跳过的目录和文件
    SKIP_DIRS = {"node_modules", ".git", "__pycache__", "venv", ".venv", "dist", "build",
                 "tests", "test", "__tests__", "spec", "__test__", "fixtures", "mocks",
                 "testdata", "test_data", "examples", "example", "docs"}
    SKIP_FILES = {"example.env", ".env.example", ".env.sample", ".env.template",
                  "config.example.js", "config.sample.js"}
    SKIP_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".ico", ".woff", ".woff2", ".ttf",
                       ".eot", ".svg", ".mp3", ".mp4", ".zip", ".tar", ".gz", ".bin",
                       ".exe", ".dll", ".so", ".dylib", ".pyc", ".pyo",
                       ".bmp", ".tif", ".tiff", ".webp", ".pdf", ".lock"}

    async def scan(self, repo_path: str) -> ScanResult:
        findings = []

        for root, dirs, files in os.walk(repo_path):
            # 原地修改 dirs 来跳过不需要的目录
            dirs[:] = [d for d in dirs if d not in self.SKIP_DIRS]

            for fname in files:
                if Path(fname).suffix.lower() in self.SKIP_EXTENSIONS:
                    continue
                if fname.lower() in self.SKIP_FILES:
                    continue
                # 跳过测试文件名
                if re.search(r"(test_|_test\.|\.test\.|\.spec\.|mock|fixture)", fname, re.IGNORECASE):
                    continue

                fpath = os.path.join(root, fname)

                # 跳过大文件（>1MB）
                try:
                    if os.path.getsize(fpath) > 1_000_000:
                        continue
                except OSError:
                    continue

                try:
                    content = Path(fpath).read_text(errors="ignore")
                except OSError:
                    continue

                rel_path = os.path.relpath(fpath, repo_path)
                for pattern, label in self.SECRET_PATTERNS:
                    for match in re.finditer(pattern, content):
                        matched_text = match.group()
                        # 过滤假值/占位符
                        if self.DUMMY_VALUES.search(matched_text):
                            continue
                        findings.append(f"[{label}] {rel_path}")
                        break  # 每个文件每种模式只报一次

        has_keys = len(findings) > 0
        detail_text = "\n".join(findings[:20]) if findings else "未检测到 API Key 泄露"

        return ScanResult(
            tool="secret_scanner",
            vulnerabilities=len(findings),
            severity_high=len(findings),  # API key 泄露算高危
            has_api_keys=has_keys,
            details=detail_text,
        )


# ---------------------------------------------------------------------------
# 编排函数：运行所有扫描器并合并结果
# ---------------------------------------------------------------------------

def _merge_results(results: list[ScanResult]) -> ScanResult:
    """合并多个扫描器的结果"""
    merged = ScanResult()
    tools = []
    details_parts = []
    all_permissions = set()

    for r in results:
        if r.tool:
            tools.append(r.tool)
        merged.vulnerabilities += r.vulnerabilities
        merged.severity_high += r.severity_high
        merged.severity_medium += r.severity_medium
        merged.severity_low += r.severity_low
        all_permissions.update(r.permissions)
        if r.has_api_keys:
            merged.has_api_keys = True
        if r.details:
            details_parts.append(r.details)

    merged.tool = ",".join(tools)
    merged.permissions = sorted(all_permissions)
    merged.details = "\n---\n".join(details_parts)
    return merged


async def run_all_scanners(repo_path: str) -> ScanResult:
    """对一个仓库运行所有扫描器并合并结果"""
    scanners: list[Scanner] = [
        SemgrepScanner(),
        TrivyScanner(),
        SecretScanner(),
    ]

    results = await asyncio.gather(
        *[s.scan(repo_path) for s in scanners],
        return_exceptions=True,
    )

    # 过滤掉异常，只保留正常结果
    valid_results = []
    for r in results:
        if isinstance(r, ScanResult):
            valid_results.append(r)
        elif isinstance(r, Exception):
            valid_results.append(ScanResult(
                tool="error",
                details=f"扫描器异常: {r}",
            ))

    if not valid_results:
        return ScanResult(details="所有扫描器均失败")

    return _merge_results(valid_results)
