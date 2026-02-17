# 贡献指南

感谢你对 AgentStore 的关注！以下是参与贡献的指南。

## 开发环境搭建

### 前置要求

- Python 3.11+
- Node.js 18+
- Git

### 后端（FastAPI）

```bash
# 克隆仓库
git clone https://github.com/your-org/AgentStore.git
cd AgentStore

# 创建虚拟环境
python -m venv .venv
source .venv/bin/activate  # macOS/Linux

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env，填入你的 API Key

# 启动 API 服务
python -m uvicorn api.main:app --reload --port 8002
```

### 前端（Next.js）

```bash
cd web

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000 查看前端页面。

## 代码规范

- **注释语言**：代码注释统一使用中文
- **前端主题**：暗色主题优先，UI 组件基于 Tailwind CSS
- **Python 风格**：遵循 PEP 8，使用 type hints
- **TypeScript**：优先使用 TypeScript，避免 `any` 类型
- **提交信息**：使用英文，格式为 `type: description`（如 `feat: add search API`）

## PR 流程

1. **Fork 仓库**并创建功能分支：`git checkout -b feat/your-feature`
2. **开发并测试**：确保本地运行正常
3. **提交代码**：遵循上述代码规范
4. **创建 Pull Request**：
   - 标题简洁明了（70 字符以内）
   - 描述中说明改了什么、为什么改
   - 如果涉及 UI 变更，附上截图
5. **等待 Review**：维护者会尽快审阅

## Issue 模板

提 Issue 时请包含以下信息：

### Bug 报告

- **环境**：操作系统、Python/Node 版本
- **复现步骤**：具体操作步骤
- **期望行为**：你认为应该发生什么
- **实际行为**：实际发生了什么
- **错误日志**：相关的报错信息

### 功能建议

- **场景描述**：你想解决什么问题
- **方案建议**：你认为可以怎么实现
- **替代方案**：是否考虑过其他方式

## 项目结构

```
AgentStore/
├── api/           # FastAPI 后端
├── web/           # Next.js 前端
├── data/          # 运行时数据（不提交到 Git）
├── scripts/       # 数据管线和工具脚本
├── tests/         # 测试
└── requirements.txt
```

## 有问题？

欢迎通过 Issue 讨论，或直接在 PR 中留言。
