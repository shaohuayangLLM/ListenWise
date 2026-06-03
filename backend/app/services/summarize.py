"""LLM 总结服务：基于转写逐字稿生成结构化摘要（D8 自动产物）。

输出 schema（需求纪要 §5.2）：
  summary = {tldr, outline:[{title, start_sec, points}]}
highlights / keywords 为手动触发产物，另行实现。
"""

import json
import logging

import httpx

from app.services.provider_config import ResolvedProvider

logger = logging.getLogger(__name__)

_SUMMARY_PROMPT = """你是播客/会议内容分析助手。下面是一段带时间戳的逐字稿，请输出**严格的 JSON**：
{{
  "tldr": "1-3 句话概括全文核心",
  "outline": [
    {{"title": "章节标题", "start_sec": 起始秒数(整数), "points": ["要点1", "要点2"]}}
  ]
}}
要求：
- outline 按主题分 3-8 节；start_sec 必须引用逐字稿中真实出现的时间戳，禁止编造。
- 只输出 JSON，不要任何额外文字或 markdown 代码块标记。

逐字稿：
{transcript}
"""


def _build_transcript_text(segments: list[dict], limit: int = 12000) -> str:
    lines = [f"[{int(s.get('start', 0))}s] {s.get('text', '')}" for s in segments]
    text = "\n".join(lines)
    return text[:limit]


def _extract_json(content: str) -> dict:
    content = content.strip()
    # 容错：去掉可能的 ```json ... ``` 包裹
    if content.startswith("```"):
        content = content.strip("`")
        if content.lower().startswith("json"):
            content = content[4:]
        content = content.strip()
    return json.loads(content)


def summarize(segments: list[dict], provider: ResolvedProvider) -> dict:
    """调用 LLM 生成 summary（tldr + 带时间戳 outline）。"""
    if not segments:
        return {"tldr": "", "outline": []}

    transcript = _build_transcript_text(segments)
    prompt = _SUMMARY_PROMPT.format(transcript=transcript)
    base = (provider.base_url or "https://dashscope.aliyuncs.com/compatible-mode/v1").rstrip("/")

    resp = httpx.post(
        f"{base}/chat/completions",
        headers={"Authorization": f"Bearer {provider.api_key}"},
        json={
            "model": provider.model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.3,
        },
        timeout=120,
    )
    resp.raise_for_status()
    content = resp.json()["choices"][0]["message"]["content"]
    logger.info("LLM summary raw length=%d", len(content))
    try:
        return _extract_json(content)
    except (json.JSONDecodeError, ValueError) as e:
        logger.error("Summary JSON 解析失败: %s; raw=%s", e, content[:500])
        # 降级：至少返回 tldr 为原始文本片段
        return {"tldr": content[:200], "outline": []}
