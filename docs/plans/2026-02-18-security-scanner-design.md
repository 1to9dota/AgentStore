# AgentStore 安全扫描模块设计

> 日期：2026-02-18
> 状态：设计阶段
> 目标：从"AI 猜测安全分"升级为"静态分析 + AI 分析"混合评分

---

## 1. 目标

当前 AgentStore 的 safety 评分 100% 依赖 AI 读 README 猜测（`ai_analyzer.py` 中 `safety_score` 由 LLM 给出，`score.py` 中 AI 占 85% 权重），缺乏真实的代码级验证。

**V1 目标：**
- 对有 GitHub 仓库的 MCP 插件进行**真实的静态代码扫描**
- 检测已知 CVE 漏洞、硬编码密钥、危险 API 调用、过度权限请求
- 将扫描结果量化，与 AI 分析结合，产出更可信的 safety 评分
- 扫描结果可在前端展示，增加用户信任度

**不做的事（V1 范围外）：**
- 动态分析 / 沙箱运行（复杂度太高）
- 容器镜像扫描（大部分 MCP 插件不提供镜像）
- 实时持续监控（V1 只做离线批量扫描）

---

## 2. 扫描维度

| 维度 | 检测内容 | 工具 | 优先级 |
|------|---------|------|--------|
| **代码安全漏洞** | OWASP Top 10、注入、XSS、路径遍历、命令注入 | Semgrep / Opengrep | P0 |
| **依赖漏洞** | 已知 CVE（npm/pip/go 依赖） | Trivy | P0 |
| **密钥泄露** | API Key、Token、密码硬编码 | Semgrep secrets 规则 + Trivy | P0 |
| **权限分析** | 文件系统访问、网络请求、环境变量读取、子进程执行 | 自定义 Semgrep 规则 + AI | P1 |
| **Python 安全** | Python 特有的安全问题（eval/exec/pickle/subprocess） | Bandit | P1 |
| **MCP 协议安全** | 工具描述注入、过度权限声明、隐藏行为 | Cisco MCP Scanner + AI | P2 |

---

## 3. 技术选型

### 3.1 工具调研总结

| 工具 | 用途 | 语言支持 | 输出格式 | 免费？ | Mac 可用 | 推荐度 |
|------|------|---------|---------|--------|---------|--------|
| **Semgrep CE** | SAST 静态分析 | 30+ 语言 | JSON/SARIF | 社区版免费，规则有限制 | brew install | ★★★★ |
| **Opengrep** | Semgrep 开源分叉 | 同 Semgrep | JSON/SARIF | 完全免费 LGPL 2.1 | 支持 | ★★★★★ |
| **Bandit** | Python 安全扫描 | Python only | JSON/SARIF/CSV | 完全免费 | pip install | ★★★★★ |
| **Trivy** | 依赖/CVE/密钥扫描 | 全语言依赖 | JSON/SARIF/Table | 完全免费 Apache 2.0 | brew install | ★★★★★ |
| **npm audit** | JS 依赖漏洞 | JS/TS only | JSON | 免费 | npm 内置 | ★★★ |
| **Cisco MCP Scanner** | MCP 服务器安全 | MCP 协议 | JSON | 免费 Apache 2.0 | Python 运行 | ★★★ |

### 3.2 推荐工具组合

**核心三件套（P0，必须实现）：**

1. **Semgrep CE / Opengrep** — 通用代码安全扫描
   - 安装：`brew install semgrep` 或 `pip install opengrep`
   - CLI：`semgrep scan --config auto --json -o results.json <repo_path>`
   - 选 Opengrep 的理由：完全开源，无规则限制，社区活跃（Endor Labs、Aikido Security 等支持）
   - 选 Semgrep CE 的理由：生态更成熟，规则库更丰富，文档更完善
   - **建议：先用 Semgrep CE，如果遇到规则限制再切 Opengrep，两者 CLI 兼容**

2. **Trivy** — 依赖漏洞 + 密钥检测
   - 安装：`brew install trivy`
   - CLI：`trivy fs --format json --scanners vuln,secret <repo_path>`
   - 支持 pip requirements.txt、package-lock.json、go.sum 等
   - 内置密钥检测规则，不需要额外配置

3. **Bandit** — Python 项目深度扫描
   - 安装：`pip install bandit`
   - CLI：`bandit -r <repo_path> -f json -o results.json`
   - 针对 Python 特有问题：eval()、pickle、subprocess、SQL 注入等
   - 大部分 MCP 插件是 Python 写的，这个工具针对性最强

**增强（P1，第二阶段）：**

4. **自定义 Semgrep 规则** — MCP 权限分析
   - 编写针对 MCP 插件的自定义规则（检测 `os.system`、`subprocess`、`open()` 等高风险调用）
   - 检测环境变量读取模式（`os.environ`、`process.env`）

5. **npm audit** — JS/TS 项目依赖扫描（当 Trivy 覆盖不足时补充）

**探索（P2，看情况）：**

6. **Cisco MCP Scanner** — 专门针对 MCP 协议的安全扫描
   - 需要实际运行 MCP Server 才能扫描，不适合离线批量场景
   - V1 暂不集成，但值得关注

---

## 4. 架构设计

### 4.1 管线集成

当前管线：`discover → collect → analyze → score → output`

新管线：`discover → collect → **scan** → analyze → score → output`

scan 阶段插入在 collect 之后、analyze 之前，因为：
- scan 需要已 clone 的代码（collect 阶段可以顺带 clone）
- analyze（AI 分析）可以读取 scan 结果，做更精准的安全评估

```
[discover]  发现 MCP 插件列表
    ↓
[collect]   采集 GitHub 元数据 + **浅克隆仓库代码**
    ↓
[scan]      对克隆的代码运行安全扫描工具
    ↓
[analyze]   AI 分析（增强：读取 scan 结果辅助评估）
    ↓
[score]     计算评分（增强：结合 scan 结果）
    ↓
[output]    输出 JSON + 写入 DB
    ↓
[cleanup]   删除临时克隆的仓库（节省磁盘）
```

### 4.2 新增模块

```
scripts/
├── scanner/
│   ├── __init__.py
│   ├── base.py          # ScanResult 数据模型 + Scanner 基类
│   ├── semgrep.py       # Semgrep/Opengrep 扫描器
│   ├── trivy.py         # Trivy 依赖漏洞扫描器
│   ├── bandit_scan.py   # Bandit Python 扫描器
│   ├── permissions.py   # 权限分析（自定义规则）
│   └── orchestrator.py  # 编排所有扫描器，合并结果
├── clone.py             # Git 浅克隆工具
└── ... (existing files)
```

### 4.3 扫描流程详情

```python
# 伪代码
async def scan_repo(repo_path: str, language: str) -> ScanReport:
    scanners = []

    # 始终运行通用扫描
    scanners.append(SemgrepScanner(repo_path))
    scanners.append(TrivyScanner(repo_path))

    # 按语言启用额外扫描
    if language == "Python":
        scanners.append(BanditScanner(repo_path))

    # 并发运行所有扫描器
    results = await asyncio.gather(*[s.run() for s in scanners])

    # 合并结果
    return merge_scan_results(results)
```

### 4.4 仓库克隆策略

- 使用 **浅克隆**（`git clone --depth 1`）节省磁盘和时间
- 克隆到临时目录 `/tmp/agentstore-scan/<slug>/`
- 扫描完成后清理
- 并发控制：最多同时 3 个 clone + scan（避免打爆磁盘 IO）
- 超时限制：单个仓库最多 5 分钟（clone + scan 总计）
- 仓库大小限制：跳过 > 500MB 的仓库

---

## 5. 数据模型

### 5.1 扫描结果结构

```python
@dataclass
class ScanFinding:
    """单条扫描发现"""
    tool: str              # "semgrep" | "trivy" | "bandit"
    rule_id: str           # 规则 ID，如 "python.lang.security.audit.exec-detected"
    severity: str          # "critical" | "high" | "medium" | "low" | "info"
    message: str           # 描述
    file_path: str         # 相对路径
    line: int              # 行号
    category: str          # "vulnerability" | "secret" | "permission" | "code_quality"

@dataclass
class ScanReport:
    """单个仓库的扫描报告"""
    slug: str
    scanned_at: str        # ISO 时间戳
    scan_duration_ms: int
    tools_used: list[str]
    language: str

    # 汇总统计
    total_findings: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int

    # 依赖漏洞
    vulnerable_deps: int
    total_deps: int

    # 密钥泄露
    secrets_found: int

    # 权限分析
    permissions: list[str]  # ["filesystem", "network", "env_vars", "subprocess"]

    # 详细发现（前 50 条，避免数据膨胀）
    findings: list[ScanFinding]

    # 扫描失败信息
    errors: list[str]
```

### 5.2 数据库扩展

在 `capabilities` 表中新增字段：

```sql
ALTER TABLE capabilities ADD COLUMN scan_summary TEXT;      -- JSON: 扫描汇总
ALTER TABLE capabilities ADD COLUMN scan_critical INTEGER DEFAULT 0;
ALTER TABLE capabilities ADD COLUMN scan_high INTEGER DEFAULT 0;
ALTER TABLE capabilities ADD COLUMN scan_medium INTEGER DEFAULT 0;
ALTER TABLE capabilities ADD COLUMN scan_low INTEGER DEFAULT 0;
ALTER TABLE capabilities ADD COLUMN scan_secrets INTEGER DEFAULT 0;
ALTER TABLE capabilities ADD COLUMN scan_vuln_deps INTEGER DEFAULT 0;
ALTER TABLE capabilities ADD COLUMN scan_permissions TEXT;   -- JSON array
ALTER TABLE capabilities ADD COLUMN scanned_at TEXT;
```

新增独立表存完整扫描结果：

```sql
CREATE TABLE scan_findings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL,
    tool TEXT NOT NULL,
    rule_id TEXT,
    severity TEXT,
    message TEXT,
    file_path TEXT,
    line INTEGER,
    category TEXT,
    scanned_at TEXT,
    FOREIGN KEY (slug) REFERENCES capabilities(slug)
);

CREATE INDEX idx_findings_slug ON scan_findings(slug);
CREATE INDEX idx_findings_severity ON scan_findings(severity);
```

### 5.3 输出 JSON 扩展

在 `assemble_output()` 中新增：

```python
"scan": {
    "scanned_at": "2026-02-18T12:00:00Z",
    "tools_used": ["semgrep", "trivy", "bandit"],
    "critical": 0,
    "high": 2,
    "medium": 5,
    "low": 12,
    "secrets_found": 0,
    "vulnerable_deps": 3,
    "permissions": ["filesystem", "network"],
    "top_findings": [...]  # 前 5 条最严重的发现
}
```

---

## 6. 评分公式更新

### 6.1 当前 safety 评分（纯 AI）

```python
# score.py 现状
def _score_safety(data):
    ai_part = data.analysis.safety_score * 0.85   # AI 猜测占 85%
    code_bonus = 0.0
    if data.repo.has_tests: code_bonus += 1.0     # 有测试 +1
    if data.repo.has_typescript: code_bonus += 0.5 # TypeScript +0.5
    return clamp(ai_part + code_bonus)
```

**问题**：AI 没看过代码，只读 README，safety_score 基本是瞎猜。

### 6.2 新 safety 评分（扫描 + AI 混合）

```python
def _score_safety_v1(data, scan: ScanReport | None):
    """安全性 = 扫描结果 (50%) + AI 分析 (35%) + 代码指标 (15%)"""

    # ---- 扫描分（50%）----
    if scan and scan.total_findings >= 0:
        # 基础分 10，按严重度扣分
        scan_score = 10.0
        scan_score -= scan.critical_count * 3.0   # critical 每个扣 3 分
        scan_score -= scan.high_count * 1.5       # high 每个扣 1.5 分
        scan_score -= scan.medium_count * 0.5     # medium 每个扣 0.5 分
        scan_score -= scan.low_count * 0.1        # low 每个扣 0.1 分

        # 密钥泄露严惩
        if scan.secrets_found > 0:
            scan_score -= scan.secrets_found * 2.0

        # 依赖漏洞
        if scan.total_deps > 0:
            vuln_ratio = scan.vulnerable_deps / scan.total_deps
            scan_score -= vuln_ratio * 3.0

        scan_score = clamp(scan_score, 0.0, 10.0)
        scan_weight = 0.50
    else:
        # 无法扫描时，退化为旧模式
        scan_score = 0.0
        scan_weight = 0.0

    # ---- AI 分（35%）----
    ai_weight = 0.35 if scan else 0.85  # 无扫描时 AI 权重回到 85%
    ai_score = data.analysis.safety_score

    # ---- 代码指标分（15%）----
    code_score = 0.0
    if data.repo.has_tests: code_score += 4.0
    if data.repo.has_typescript: code_score += 2.0
    # 权限越少越安全
    if scan and len(scan.permissions) <= 1: code_score += 4.0
    elif scan and len(scan.permissions) <= 3: code_score += 2.0
    code_weight = 0.15

    # 归一化权重（确保总和为 1）
    total_weight = scan_weight + ai_weight + code_weight
    return clamp(
        (scan_score * scan_weight + ai_score * ai_weight + code_score * code_weight) / total_weight
    )
```

### 6.3 AI 分析增强

更新 `ai_analyzer.py` 的 system prompt，让 AI 参考扫描结果：

```
同时参考以下静态扫描结果进行安全评估：
- 发现 {critical} 个严重漏洞、{high} 个高危漏洞
- 依赖漏洞：{vuln_deps}/{total_deps}
- 密钥泄露：{secrets_found} 处
- 检测到的权限：{permissions}
请结合扫描结果和 README 内容，给出更准确的安全评分。
```

---

## 7. 实现任务拆分

| # | 任务 | 描述 | 预估代码量 | 依赖 |
|---|------|------|-----------|------|
| T1 | **Git 浅克隆工具** | `scripts/clone.py`：异步浅克隆、超时控制、磁盘清理 | ~80 行 | 无 |
| T2 | **Scanner 基础框架** | `scripts/scanner/base.py`：ScanFinding/ScanReport 模型、Scanner 基类、结果合并逻辑 | ~120 行 | 无 |
| T3 | **Semgrep 扫描器** | `scripts/scanner/semgrep.py`：调用 CLI、解析 JSON 输出、映射 severity | ~100 行 | T2 |
| T4 | **Trivy 扫描器** | `scripts/scanner/trivy.py`：依赖漏洞 + 密钥检测、解析 JSON | ~100 行 | T2 |
| T5 | **Bandit 扫描器** | `scripts/scanner/bandit_scan.py`：Python 项目专用、解析 JSON | ~80 行 | T2 |
| T6 | **扫描编排器** | `scripts/scanner/orchestrator.py`：按语言选工具、并发控制、结果合并 | ~120 行 | T2-T5 |
| T7 | **管线集成** | 修改 `pipeline.py`：插入 scan 阶段、传递 ScanReport 到 score | ~60 行 | T1, T6 |
| T8 | **评分公式更新** | 修改 `score.py`：实现 `_score_safety_v1()`、更新数据模型 | ~80 行 | T7 |
| T9 | **数据库扩展** | 修改 `database.py`：新增字段、scan_findings 表、查询接口 | ~100 行 | T7 |
| T10 | **前端展示** | 在详情页展示扫描结果徽章、发现列表 | ~200 行 | T9 |

**总计约 1000 行代码，预计 3-5 天完成 T1-T9（不含前端）。**

### 建议实施顺序

```
Phase 1（1-2 天）：T1 + T2 → 基础设施
Phase 2（1-2 天）：T3 + T4 + T5 → 三个扫描器（可并行开发）
Phase 3（1 天）：T6 + T7 + T8 + T9 → 集成 + 评分更新
Phase 4（后续）：T10 → 前端展示
```

---

## 8. 风险和限制

### 8.1 无法扫描的情况

| 情况 | 应对 |
|------|------|
| 无 GitHub 仓库（只有 endpoint） | 跳过扫描，退化为纯 AI 评分（标记"未扫描"） |
| 私有仓库 | 无法 clone，跳过 |
| 仓库过大（>500MB） | 跳过，标记原因 |
| 非代码仓库（纯文档） | Semgrep/Bandit 无结果，只跑 Trivy |
| 工具未安装 | 优雅降级，跳过该工具，用其他工具的结果 |

### 8.2 误报处理

- Semgrep 和 Bandit 的误报率约 10-20%
- **策略**：不因单条 medium/low 发现大幅扣分，只有 critical/high 密集时才严重影响评分
- 在前端标注"自动扫描结果，仅供参考"
- 后续可增加人工标注/申诉机制

### 8.3 性能约束

- 单个仓库扫描预计 10-30 秒（含 clone）
- 500 个仓库全量扫描：约 2-4 小时（并发 3）
- 建议增量扫描：只扫新增或更新的仓库
- 临时文件空间：`/tmp` 需要约 2-5GB 峰值空间

### 8.4 安全与隐私

- clone 的代码只在本地临时存在，扫描后立即删除
- 不上传任何代码到第三方服务（所有工具本地运行）
- 扫描发现中的具体代码片段不存入数据库（只存规则 ID、文件路径、行号）

### 8.5 工具依赖风险

- Semgrep CE 许可证在 2024 年底收紧，部分高级规则移入付费版
  - 缓解：密切关注 Opengrep 进展，必要时切换
- Trivy 由 Aqua Security 维护，目前完全开源，风险低
- Bandit 是 PyCQA 官方项目，稳定可靠

---

## 9. 前置准备

在开始编码之前，需要在开发机上安装以下工具：

```bash
# Semgrep
brew install semgrep
# 或 pip install semgrep

# Trivy
brew install trivy

# Bandit
pip install bandit

# 验证安装
semgrep --version
trivy --version
bandit --version
```

---

## 10. 成功指标

| 指标 | 目标 |
|------|------|
| 扫描覆盖率 | >80% 有 GitHub 仓库的插件能完成扫描 |
| 扫描耗时 | 单个仓库 < 60 秒 |
| 评分可信度 | safety 分与真实安全状况的关联度明显提升（可通过抽样人工验证） |
| 用户感知 | 详情页展示扫描徽章，用户能看到具体发现 |

---

## 参考资料

- [Semgrep Community Edition](https://semgrep.dev/products/community-edition/)
- [Opengrep - 开源代码安全引擎](https://www.opengrep.dev/)
- [Trivy - 开源漏洞扫描器](https://trivy.dev/)
- [Bandit - Python 安全扫描](https://github.com/PyCQA/bandit)
- [npm audit 文档](https://docs.npmjs.com/cli/v8/commands/npm-audit/)
- [Cisco MCP Scanner](https://github.com/cisco-ai-defense/mcp-scanner)
- [MCP Server 安全现状报告 2025 - Astrix](https://astrix.security/learn/blog/state-of-mcp-server-security-2025/)
- [OWASP MCP Top 10](https://www.msspalert.com/native/owasp-mcp-10-external-aiexposures-you-must-prioritize-in-2026)
