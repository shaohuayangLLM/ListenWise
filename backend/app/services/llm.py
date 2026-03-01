"""LLM service for document generation, compatible with OpenAI protocol."""

import json
import logging

import httpx

from app.config import settings
from app.services.templates import get_mock_document, get_system_prompt

logger = logging.getLogger(__name__)

# DashScope OpenAI-compatible endpoint
DASHSCOPE_COMPATIBLE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"


def _get_llm_config() -> tuple[str, str, str]:
    """Return (api_key, base_url, model) for LLM calls."""
    # Priority: explicit LLM config > DashScope key
    if settings.llm_api_key and settings.llm_base_url:
        return settings.llm_api_key, settings.llm_base_url, settings.llm_model

    if settings.dashscope_api_key:
        return settings.dashscope_api_key, DASHSCOPE_COMPATIBLE_URL, settings.llm_model

    return "", "", settings.llm_model


def _use_mock() -> bool:
    api_key, _, _ = _get_llm_config()
    return not api_key


async def generate_document(transcript_text: str, scene_type: str) -> dict:
    """Generate a structured document from transcript text using LLM."""
    if _use_mock():
        return _mock_generate(scene_type)

    return await _real_generate(transcript_text, scene_type)


def _mock_generate(scene_type: str) -> dict:
    """Return mock document data for development."""
    logger.info("Using mock LLM mode for scene: %s", scene_type)
    return get_mock_document(scene_type)


async def _real_generate(transcript_text: str, scene_type: str) -> dict:
    """Call LLM API (OpenAI-compatible) to generate document."""
    api_key, base_url, model = _get_llm_config()
    logger.info("Using real LLM mode for scene: %s (model: %s)", scene_type, model)

    system_prompt = get_system_prompt(scene_type)

    async with httpx.AsyncClient(timeout=120) as client:
        response = await client.post(
            f"{base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {
                        "role": "user",
                        "content": f"以下是会议/录音的转录文本，请按要求整理：\n\n{transcript_text}",
                    },
                ],
                "temperature": 0.3,
                "response_format": {"type": "json_object"},
            },
        )
        response.raise_for_status()

        data = response.json()
        content = data["choices"][0]["message"]["content"]

        try:
            return json.loads(content)
        except json.JSONDecodeError:
            logger.error("LLM returned invalid JSON: %s", content[:200])
            return {"raw_content": content, "parse_error": True}
