"""多模型 AI 分析引擎

支持: openai / anthropic / gemini / ollama
通过 .env 中的 AI_PROVIDER 配置切换
"""
import json
from abc import ABC, abstractmethod
from .models import AnalysisResult


_SYSTEM_PROMPT = """你是一个 AI Agent 能力评估专家。分析给定的 Agent 能力（skill/plugin），从以下 4 个维度评分（0-10）：

1. **reliability_score** (可靠性): 代码质量、错误处理、稳定性
   - 9-10: 生产级，完善的错误处理和测试
   - 5-6: 能用但有粗糙之处
   - 0-2: 实验性，可能频繁出错

2. **safety_score** (安全性): 权限范围、数据泄露风险、恶意行为
   - 9-10: 最小权限原则，无数据泄露风险
   - 5-6: 权限合理但缺乏明确说明
   - 0-2: 权限过大或有安全隐患

3. **capability_score** (能力范围): 功能完整度、边界情况处理
   - 9-10: 功能完整，覆盖边界情况
   - 5-6: 核心功能可用，边界情况不足
   - 0-2: 功能原始，仅概念验证

4. **usability_score** (易用性): 文档质量、接口设计、接入门槛
   - 9-10: 文档完善，示例丰富，5 分钟上手
   - 5-6: 基本文档，需要看代码才能用
   - 0-2: 几乎无文档

同时提供：
- summary: 2-3 句话总结（必须使用中文）
- one_liner: 一句话描述（最多 80 字符，必须使用中文）
- install_guide: 安装步骤（Markdown）
- usage_guide: 使用示例（Markdown）
- safety_notes: 安全分析说明
- category_suggestion: 分类建议（development / data / web / productivity / ai / media / trading / communication）

重要：summary 和 one_liner 字段必须使用中文撰写，其他字段可以使用英文。

以纯 JSON 格式返回，不要包裹在代码块中。JSON 字段值中不要使用 markdown 代码块（```），改用纯文本描述安装和使用步骤。"""


class AIAnalyzer(ABC):
    """AI 分析引擎基类"""

    def get_system_prompt(self) -> str:
        return _SYSTEM_PROMPT

    @abstractmethod
    async def analyze(self, name: str, readme: str, description: str) -> AnalysisResult:
        ...

    def parse_response(self, raw: str) -> AnalysisResult:
        try:
            # 先尝试直接解析（response_format=json_object 时无代码块包裹）
            try:
                data = json.loads(raw.strip())
            except json.JSONDecodeError:
                # 兜底：用正则找最外层 JSON 对象
                import re
                match = re.search(r'\{[\s\S]*\}', raw)
                if match:
                    data = json.loads(match.group())
                else:
                    return AnalysisResult()
            return AnalysisResult(
                reliability_score=float(data.get("reliability_score", 0)),
                safety_score=float(data.get("safety_score", 0)),
                capability_score=float(data.get("capability_score", 0)),
                usability_score=float(data.get("usability_score", 0)),
                summary=str(data.get("summary", "")),
                one_liner=str(data.get("one_liner", ""))[:80],
                install_guide=str(data.get("install_guide", "")),
                usage_guide=str(data.get("usage_guide", "")),
                safety_notes=str(data.get("safety_notes", "")),
                category_suggestion=str(data.get("category_suggestion", "")),
            )
        except (json.JSONDecodeError, KeyError, TypeError):
            return AnalysisResult()


class OpenAIAnalyzer(AIAnalyzer):
    def __init__(self, api_key: str, model: str = "gpt-4o-mini"):
        from openai import AsyncOpenAI
        self.client = AsyncOpenAI(api_key=api_key)
        self.model = model

    async def analyze(self, name: str, readme: str, description: str) -> AnalysisResult:
        truncated = readme[:8000]
        resp = await self.client.chat.completions.create(
            model=self.model, max_tokens=1500,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": self.get_system_prompt()},
                {"role": "user", "content": f"能力名称: {name}\n描述: {description}\n\nREADME:\n{truncated}"},
            ],
        )
        return self.parse_response(resp.choices[0].message.content or "")


class AnthropicAnalyzer(AIAnalyzer):
    def __init__(self, api_key: str, model: str = "claude-sonnet-4-5-20250929"):
        from anthropic import AsyncAnthropic
        self.client = AsyncAnthropic(api_key=api_key)
        self.model = model

    async def analyze(self, name: str, readme: str, description: str) -> AnalysisResult:
        truncated = readme[:8000]
        resp = await self.client.messages.create(
            model=self.model, max_tokens=1500,
            system=self.get_system_prompt(),
            messages=[{"role": "user", "content": f"能力名称: {name}\n描述: {description}\n\nREADME:\n{truncated}"}],
        )
        return self.parse_response(resp.content[0].text)


class GeminiAnalyzer(AIAnalyzer):
    def __init__(self, api_key: str, model: str = "gemini-2.0-flash"):
        from google import genai
        self.client = genai.Client(api_key=api_key)
        self.model = model

    async def analyze(self, name: str, readme: str, description: str) -> AnalysisResult:
        truncated = readme[:8000]
        resp = self.client.models.generate_content(
            model=self.model,
            contents=f"{self.get_system_prompt()}\n\n能力名称: {name}\n描述: {description}\n\nREADME:\n{truncated}",
        )
        return self.parse_response(resp.text or "")


class OllamaAnalyzer(AIAnalyzer):
    def __init__(self, model: str = "llama3", base_url: str = "http://localhost:11434"):
        import httpx
        self.model = model
        self.client = httpx.AsyncClient(base_url=base_url, timeout=120)

    async def analyze(self, name: str, readme: str, description: str) -> AnalysisResult:
        truncated = readme[:4000]
        resp = await self.client.post("/api/chat", json={
            "model": self.model, "stream": False,
            "messages": [
                {"role": "system", "content": self.get_system_prompt()},
                {"role": "user", "content": f"能力名称: {name}\n描述: {description}\n\nREADME:\n{truncated}"},
            ],
        })
        data = resp.json()
        return self.parse_response(data.get("message", {}).get("content", ""))


def create_analyzer(provider: str = "openai", **kwargs) -> AIAnalyzer:
    if provider == "openai":
        return OpenAIAnalyzer(api_key=kwargs.get("api_key", ""))
    elif provider == "anthropic":
        return AnthropicAnalyzer(api_key=kwargs.get("api_key", ""))
    elif provider == "gemini":
        return GeminiAnalyzer(api_key=kwargs.get("api_key", ""))
    elif provider == "ollama":
        return OllamaAnalyzer(model=kwargs.get("model", "llama3"))
    else:
        raise ValueError(f"Unsupported AI provider: {provider}")
