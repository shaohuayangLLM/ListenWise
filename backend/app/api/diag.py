"""跨境网络验证端点（阶段① 临时）。

部署到 Render(海外）后，实测海外服务器调用国内阿里云 Fun-ASR 的延迟与成功率。
不依赖 db / celery / redis —— 只需配好 DASHSCOPE_API_KEY 即可工作。
验证结论确定后，此文件与 main.py 中的注册行可一并删除。
"""

import logging
import os
import tempfile
import time
from pathlib import Path

from fastapi import APIRouter, Header, HTTPException, UploadFile

from app.models.base import Capability
from app.services.asr import transcribe
from app.services.provider_config import _env_fallback

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/diag", tags=["diag"])


@router.post("/transcribe")
async def diag_transcribe(
    file: UploadFile,
    x_diag_token: str = Header(default=""),
):
    """上传一个音频，同步转写，返回各项耗时与成功与否（用于跨境网络验证）。"""
    expected = os.getenv("DIAG_TOKEN", "")
    if expected and x_diag_token != expected:
        raise HTTPException(status_code=403, detail="invalid diag token")

    provider = _env_fallback(Capability.asr)
    if not provider or not provider.api_key:
        raise HTTPException(status_code=400, detail="未配置 DASHSCOPE_API_KEY")

    suffix = Path(file.filename or "audio").suffix or ".wav"
    data = await file.read()
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(data)
        path = tmp.name

    t0 = time.monotonic()
    try:
        result = await transcribe(path, provider)
        return {
            "success": True,
            "provider": provider.provider,
            "model": provider.model,
            "file_size_mb": round(len(data) / 1024 / 1024, 2),
            "total_sec": round(time.monotonic() - t0, 1),
            "word_count": result.word_count,
            "segment_count": len(result.segments),
            "sample": result.full_text[:120],
        }
    except Exception as e:  # noqa: BLE001 - 诊断端点：把异常如实回传，便于定位跨境问题
        logger.exception("diag transcribe failed")
        return {
            "success": False,
            "error": str(e),
            "total_sec": round(time.monotonic() - t0, 1),
        }
    finally:
        try:
            os.unlink(path)
        except OSError:
            pass
