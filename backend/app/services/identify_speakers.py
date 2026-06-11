"""LLM 自动说话人命名：根据对话里的自我介绍/互相称呼 + 节目背景，
把 ASR 的 A/B/C 说话人标记映射成真实姓名（写入 speaker_labels）。

参考 PodNote：用 LLM 从「我是石磊」这类自我介绍 + shownotes 主播名单推断姓名。
宁缺勿错——识别不出的说话人不返回，保持原标记，用户仍可手动改。
"""

import json
import logging

import httpx

from app.services.provider_config import ResolvedProvider
from app.services.summarize import _extract_json

logger = logging.getLogger(__name__)

# 自我介绍多在开头，节选前若干字符即可覆盖；过长徒增成本
_LINES_LIMIT = 8000

_PROMPT = """你是播客/会议转写的说话人识别助手。下面的逐字稿用 A/B/C 等标记区分说话人。
请根据：① 对话中的自我介绍（如"我是石磊"）、互相称呼（如"敏姐你怎么看"）；② 下方节目/会议背景里的人物名单，推断每个说话人标记对应的真实姓名。

只输出严格 JSON：{{"A": "石磊", "B": "刘敏"}}——键是原说话人标记，值是推断的真实姓名。
- 有把握才填；识别不出的说话人**不要写进结果**（宁缺勿错，绝不编造姓名）。
- 姓名用对话/背景里出现的真实写法（含昵称对应的本名，如「敏姐」对应名单里的「刘敏」）。
- 不要任何额外文字或 markdown 代码块标记。

节目/会议背景：
{context}

逐字稿（节选）：
{lines}
"""


def _build_lines(segments: list[dict]) -> str:
    out: list[str] = []
    size = 0
    for s in segments:
        sp = s.get("speaker") or "?"
        text = s.get("text", "")
        line = f"{sp}: {text}"
        if size + len(line) > _LINES_LIMIT:
            break
        out.append(line)
        size += len(line)
    return "\n".join(out)


def identify_speakers(
    segments: list[dict],
    context: str,
    provider: ResolvedProvider,
) -> dict[str, str]:
    """返回 {说话人标记: 真实姓名}，识别不出的不含在内。"""
    speakers = {s.get("speaker") for s in segments if s.get("speaker")}
    if not speakers:
        return {}

    lines = _build_lines(segments)
    prompt = _PROMPT.format(context=context.strip() or "（无）", lines=lines)
    base = (
        provider.base_url or "https://dashscope.aliyuncs.com/compatible-mode/v1"
    ).rstrip("/")

    resp = httpx.post(
        f"{base}/chat/completions",
        headers={"Authorization": f"Bearer {provider.api_key}"},
        json={
            "model": provider.model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0,
        },
        timeout=120,
    )
    resp.raise_for_status()
    content = resp.json()["choices"][0]["message"]["content"]
    try:
        data = _extract_json(content)
    except (json.JSONDecodeError, ValueError) as e:
        logger.error("说话人识别 JSON 解析失败: %s; raw=%s", e, content[:300])
        return {}

    # 只保留真实存在的说话人标记 + 非空姓名
    result: dict[str, str] = {}
    for k, v in data.items():
        if k in speakers and isinstance(v, str) and v.strip():
            result[k] = v.strip()
    return result
