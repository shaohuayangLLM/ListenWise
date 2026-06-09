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

_SUMMARY_PROMPT = """你是播客/会议内容分析助手。下面是一段带时间戳的逐字稿，总时长约 {minutes} 分钟。请输出**严格的 JSON**：
{{
  "tldr": "1-3 句话概括全文核心",
  "outline": [
    {{"title": "章节标题", "start_sec": 起始秒数(整数), "points": ["要点1", "要点2"]}}
  ]
}}
要求：
- 按主题划分约 {target} 个章节（可酌情 ±2）。
- **章节必须在时间轴上均匀覆盖全程**：相邻章节起始时间间隔一般不超过 8 分钟，绝不允许中间留下超过 10 分钟没有章节的空档；逐字稿结尾部分也要有对应章节。
- start_sec 必须引用逐字稿中真实出现的时间戳，禁止编造，且必须严格递增。
- 只输出 JSON，不要任何额外文字或 markdown 代码块标记。
{notes_block}
逐字稿：
{transcript}
"""


_NOTES_BLOCK = """
用户在会议中手记的要点（代表 ta 当场最关注的内容）：
{notes}

请**优先呼应这些笔记要点**：把用户记下的关注点作为 tldr 和章节划分的重心，再用逐字稿补全细节、佐证或纠正笔记。
"""


# qwen-plus 上下文 128K token，中文逐字稿按 ~80000 字封顶（约 2.5 小时播客）仍有充裕余量。
def _build_transcript_text(segments: list[dict], limit: int = 80000) -> str:
    lines = [f"[{int(s.get('start', 0))}s] {s.get('text', '')}" for s in segments]
    text = "\n".join(lines)
    if len(text) > limit:
        logger.warning(
            "逐字稿 %d 字超过 %d 字上限，摘要将基于前 %d 字生成（尾部未覆盖）",
            len(text), limit, limit,
        )
        return text[:limit]
    return text


def _extract_json(content: str) -> dict:
    content = content.strip()
    # 容错：去掉可能的 ```json ... ``` 包裹
    if content.startswith("```"):
        content = content.strip("`")
        if content.lower().startswith("json"):
            content = content[4:]
        content = content.strip()
    return json.loads(content)


def summarize(
    segments: list[dict],
    provider: ResolvedProvider,
    notes: str | None = None,
) -> dict:
    """调用 LLM 生成 summary（tldr + 带时间戳 outline）。

    notes：用户在会议中手记的笔记，存在时融入 prompt，让摘要呼应用户关注点。
    """
    if not segments:
        return {"tldr": "", "outline": []}

    transcript = _build_transcript_text(segments)
    duration_sec = int(segments[-1].get("end", 0) or 0)
    minutes = max(1, duration_sec // 60)
    # 约每 5 分钟一节，限制在 3~20 节区间
    target = min(20, max(3, round(minutes / 5)))
    notes_block = _NOTES_BLOCK.format(notes=notes.strip()) if notes and notes.strip() else ""
    prompt = _SUMMARY_PROMPT.format(
        transcript=transcript, minutes=minutes, target=target, notes_block=notes_block
    )
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
