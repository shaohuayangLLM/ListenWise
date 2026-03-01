"""ASR service using DashScope Paraformer for speech-to-text with speaker diarization."""

import json
import logging
from dataclasses import dataclass
from pathlib import Path

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

MOCK_SEGMENTS = [
    {
        "start": 0.0,
        "end": 5.2,
        "speaker": "A",
        "text": "好，那我们开始今天的技术方案汇报。首先我来介绍一下整体的架构设计思路。",
    },
    {
        "start": 5.5,
        "end": 12.8,
        "speaker": "A",
        "text": "我们这次采用的是微服务架构，主要分为四个核心模块：用户服务、订单服务、支付服务和通知服务。",
    },
    {
        "start": 13.2,
        "end": 19.5,
        "speaker": "B",
        "text": "微服务的拆分粒度是怎么定的？有没有考虑过服务之间的通信开销？",
    },
    {
        "start": 20.0,
        "end": 28.3,
        "speaker": "A",
        "text": "这个问题很好。我们做了详细的领域分析，按照DDD的思路来划分边界上下文。通信方面，同步调用走gRPC，异步消息走Kafka。",
    },
    {
        "start": 28.8,
        "end": 33.5,
        "speaker": "B",
        "text": "Kafka的运维成本不低，团队有这方面的经验吗？",
    },
    {
        "start": 34.0,
        "end": 42.1,
        "speaker": "C",
        "text": "我们之前在数据平台项目中用过Kafka，有一定的运维经验。而且我们计划用托管版本来降低运维压力。",
    },
    {
        "start": 42.5,
        "end": 48.0,
        "speaker": "B",
        "text": "好的，那数据库方面呢？每个微服务独立数据库？",
    },
    {
        "start": 48.5,
        "end": 56.2,
        "speaker": "A",
        "text": "是的，每个服务有自己的数据库实例，保证数据自治。跨服务的数据一致性通过Saga模式来处理。",
    },
]


@dataclass
class TranscriptResult:
    segments: list[dict]
    full_text: str
    word_count: int
    speaker_count: int


def _get_api_key() -> str:
    """Get the DashScope API key."""
    return settings.dashscope_api_key


def _use_mock() -> bool:
    return not _get_api_key()


async def transcribe(file_path: str) -> TranscriptResult:
    """Transcribe an audio file and return structured result."""
    if _use_mock():
        return _mock_transcribe()

    return await _real_transcribe(file_path)


def _mock_transcribe() -> TranscriptResult:
    """Return mock transcription data for development."""
    logger.info("Using mock ASR mode")
    full_text = "".join(seg["text"] for seg in MOCK_SEGMENTS)
    speakers = {seg["speaker"] for seg in MOCK_SEGMENTS}
    return TranscriptResult(
        segments=MOCK_SEGMENTS,
        full_text=full_text,
        word_count=len(full_text),
        speaker_count=len(speakers),
    )


def _sync_transcribe(file_path: str) -> TranscriptResult:
    """Synchronous transcription using DashScope OSS upload + REST API."""
    import time
    import dashscope
    from dashscope.utils.oss_utils import OssUtils

    api_key = _get_api_key()
    dashscope.api_key = api_key
    logger.info("Using DashScope Paraformer for file: %s", file_path)

    # Step 1: Upload file to DashScope OSS using SDK's built-in uploader
    logger.info("Uploading file to DashScope OSS...")
    oss_url, _ = OssUtils.upload(
        model="paraformer-v2",
        file_path=file_path,
        api_key=api_key,
    )
    logger.info("File uploaded to OSS: %s", oss_url)

    # Step 2: Submit transcription task via REST API
    # The SDK doesn't add X-DashScope-OssResourceResolve, so use REST API
    logger.info("Submitting transcription task via REST API...")
    with httpx.Client(timeout=30) as client:
        submit_resp = client.post(
            "https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "X-DashScope-Async": "enable",
                "X-DashScope-OssResourceResolve": "enable",
            },
            json={
                "model": "paraformer-v2",
                "input": {"file_urls": [oss_url]},
                "parameters": {
                    "language_hints": ["zh", "en"],
                },
            },
        )
    if submit_resp.status_code != 200:
        raise RuntimeError(f"Task submit failed ({submit_resp.status_code}): {submit_resp.text}")

    submit_data = submit_resp.json()
    task_id = submit_data["output"]["task_id"]
    logger.info("Task submitted: %s", task_id)

    # Step 3: Poll for completion
    logger.info("Waiting for transcription to complete...")
    poll_url = f"https://dashscope.aliyuncs.com/api/v1/tasks/{task_id}"

    with httpx.Client(timeout=30) as client:
        for attempt in range(120):  # max ~10 minutes
            time.sleep(5)
            poll_resp = client.get(poll_url, headers={"Authorization": f"Bearer {api_key}"})
            poll_data = poll_resp.json()

            status = poll_data["output"]["task_status"]
            logger.info("Poll attempt %d: status=%s", attempt + 1, status)

            if status == "SUCCEEDED":
                logger.info("Transcription completed successfully")
                return _parse_result(poll_data["output"])
            elif status in ("FAILED", "CANCELED", "UNKNOWN"):
                error_msg = poll_data["output"].get("message", "Unknown error")
                raise RuntimeError(f"Transcription failed ({status}): {error_msg}")
            # PENDING or RUNNING, continue polling

    raise RuntimeError("Transcription timed out after 10 minutes")


def _parse_result(output) -> TranscriptResult:
    """Parse the DashScope transcription result."""
    segments = []
    all_speakers = set()

    # Handle both dict and object-style access
    if isinstance(output, dict):
        file_results = output.get("results", [])
    else:
        try:
            file_results = output.results
        except (AttributeError, TypeError):
            file_results = output.get("results", []) if hasattr(output, "get") else []

    if not file_results:
        raise ValueError(f"No results in transcription output: {output}")

    for fr in file_results:
        if isinstance(fr, dict):
            transcript_url = fr.get("transcription_url")
        else:
            transcript_url = getattr(fr, "transcription_url", None)
        if not transcript_url:
            logger.warning("No transcription_url in result: %s", fr)
            continue

        # Fetch the transcript JSON
        logger.info("Fetching transcript from: %s", transcript_url)
        resp = httpx.get(transcript_url, timeout=30)
        resp.raise_for_status()
        data = resp.json()

        # Parse the transcript data
        transcripts = data.get("transcripts", [])
        for t in transcripts:
            for sentence in t.get("sentences", []):
                spk_id = sentence.get("spk_id", 0)
                if isinstance(spk_id, int):
                    speaker_label = chr(65 + spk_id)
                else:
                    speaker_label = str(spk_id)
                all_speakers.add(speaker_label)

                begin_time = sentence.get("begin_time", 0)
                end_time = sentence.get("end_time", 0)

                segments.append({
                    "start": begin_time / 1000.0,
                    "end": end_time / 1000.0,
                    "speaker": speaker_label,
                    "text": sentence.get("text", ""),
                })

    if not segments:
        logger.error("Failed to parse any segments from transcription result")
        logger.error("Raw output: %s", json.dumps(str(output)[:1000]))
        raise ValueError("No segments parsed from transcription result")

    full_text = "".join(seg["text"] for seg in segments)
    logger.info("Parsed %d segments, %d speakers, %d chars",
                len(segments), len(all_speakers), len(full_text))

    return TranscriptResult(
        segments=segments,
        full_text=full_text,
        word_count=len(full_text),
        speaker_count=len(all_speakers) if all_speakers else 1,
    )


async def _real_transcribe(file_path: str) -> TranscriptResult:
    """Transcribe using DashScope Paraformer API."""
    import asyncio
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _sync_transcribe, file_path)
