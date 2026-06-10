"""LLM 逐字稿术语订正：修复 ASR 同音/近音误识别（如「千万三」→「千问3」）。

分块送 LLM（temperature 0），带热词词表做参照；只改误识别词，不润色不增删。
单块失败跳过继续（部分订正好于全失败），全部失败才抛错。
"""

import json
import logging
from dataclasses import replace

import httpx

from app.services.provider_config import ResolvedProvider
from app.services.summarize import _extract_json

logger = logging.getLogger(__name__)

# 每块字符上限：qwen 对长输入的逐行保真会下降，小块更稳
CHUNK_CHARS = 3000

# 订正对模型能力敏感（qwen-turbo 实测漏修「千问」「DeepSeek」等同音术语），
# 订正是手动触发、单次量小，qwen-turbo 一律升级为 qwen-plus
_MODEL_UPGRADE = {"qwen-turbo": "qwen-plus"}


def correction_provider(provider: ResolvedProvider) -> ResolvedProvider:
    """返回订正实际使用的 provider（必要时升级模型）。"""
    upgraded = _MODEL_UPGRADE.get(provider.model)
    return replace(provider, model=upgraded) if upgraded else provider

_CORRECT_PROMPT = """你是语音转写稿的术语订正助手。下面是 ASR 自动转写的逐字稿片段，每行格式为「行号|文本」。

任务：只修正明显的语音误识别——同音/近音导致的错误专有名词、术语、人名、数字与单位。

词表里是本领域的正确写法。ASR 经常把这些词听错成读音相同或相近的其他写法（中文谐音、拆字、英文词被听成中文等，如「星火」被写成「新火」）。请逐行检查：凡是读音接近词表词、且按上下文应当是词表词的，都订正为词表写法。

严格要求：
- 不改写说话风格，不删减语气词和口语重复，不做任何润色；除误识别词外，其余文字逐字保持原样。
- 上下文语义不支持时不要硬套词表；没有把握的不要改。
- 只输出严格 JSON：{{"fixes": [{{"i": 行号, "text": "订正后的整行文本"}}]}}，仅包含需要修改的行；没有需要修改的行则输出 {{"fixes": []}}。不要任何额外文字或 markdown 代码块标记。

词表：
{glossary}

逐字稿：
{lines}
"""


def _build_chunks(segments: list[dict]) -> list[list[tuple[int, str]]]:
    """按字符预算把 (全局行号, 文本) 分块。"""
    chunks: list[list[tuple[int, str]]] = []
    current: list[tuple[int, str]] = []
    size = 0
    for i, seg in enumerate(segments):
        text = seg.get("text", "")
        if current and size + len(text) > CHUNK_CHARS:
            chunks.append(current)
            current = []
            size = 0
        current.append((i, text))
        size += len(text)
    if current:
        chunks.append(current)
    return chunks


def _correct_chunk(
    chunk: list[tuple[int, str]], glossary: str, provider: ResolvedProvider
) -> dict[int, str]:
    lines = "\n".join(f"{i}|{text}" for i, text in chunk)
    prompt = _CORRECT_PROMPT.format(glossary=glossary, lines=lines)
    base = (provider.base_url or "https://dashscope.aliyuncs.com/compatible-mode/v1").rstrip("/")

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
    data = _extract_json(content)

    valid_indexes = {i for i, _ in chunk}
    fixes: dict[int, str] = {}
    for fix in data.get("fixes", []):
        i, text = fix.get("i"), fix.get("text")
        if isinstance(i, int) and i in valid_indexes and isinstance(text, str) and text:
            fixes[i] = text
    return fixes


def correct_segments(
    segments: list[dict], terms: list[str], provider: ResolvedProvider
) -> tuple[list[dict], int]:
    """订正 segments，返回（新 segments，修改行数）。不修改入参。"""
    if not segments:
        return [], 0
    glossary = "、".join(terms) if terms else "（无，凭上下文判断）"
    chunks = _build_chunks(segments)

    corrected = [dict(s) for s in segments]
    changed = 0
    failed_chunks = 0
    for n, chunk in enumerate(chunks, 1):
        try:
            fixes = _correct_chunk(chunk, glossary, provider)
        except (httpx.HTTPError, json.JSONDecodeError, ValueError) as e:
            failed_chunks += 1
            logger.warning("订正分块 %d/%d 失败，跳过: %s", n, len(chunks), e)
            continue
        for i, text in fixes.items():
            if text != corrected[i]["text"]:
                corrected[i]["text"] = text
                changed += 1
        logger.info("订正分块 %d/%d 完成，修改 %d 行", n, len(chunks), len(fixes))

    if failed_chunks == len(chunks):
        raise RuntimeError("术语订正失败：所有分块的 LLM 调用均未成功")
    return corrected, changed
