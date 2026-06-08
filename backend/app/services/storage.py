import os
import uuid
from pathlib import Path

import httpx
from fastapi import UploadFile

from app.config import settings

UPLOADS_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"


def upload_to_supabase_sync(local_path: str) -> str | None:
    """把本地音频上传到 Supabase Storage，返回 public URL；未配置则返回 None。"""
    if not (settings.supabase_url and settings.supabase_service_key):
        return None
    filename = os.path.basename(local_path)
    with open(local_path, "rb") as f:
        content = f.read()
    base = settings.supabase_url.rstrip("/")
    if not base.startswith(("http://", "https://")):
        base = f"https://{base}"
    bucket = settings.supabase_bucket
    resp = httpx.post(
        f"{base}/storage/v1/object/{bucket}/{filename}",
        headers={
            "Authorization": f"Bearer {settings.supabase_service_key}",
            "Content-Type": "application/octet-stream",
            "x-upsert": "true",
        },
        content=content,
        timeout=180,
    )
    resp.raise_for_status()
    return f"{base}/storage/v1/object/public/{bucket}/{filename}"


def delete_from_supabase_sync(public_url: str) -> bool:
    """按 public URL 从 Supabase Storage 删除一个文件；未配置/无文件名返回 False，404 视为已删。"""
    if not (settings.supabase_url and settings.supabase_service_key):
        return False
    filename = public_url.split("?")[0].rsplit("/", 1)[-1]
    if not filename:
        return False
    base = settings.supabase_url.rstrip("/")
    if not base.startswith(("http://", "https://")):
        base = f"https://{base}"
    resp = httpx.delete(
        f"{base}/storage/v1/object/{settings.supabase_bucket}/{filename}",
        headers={"Authorization": f"Bearer {settings.supabase_service_key}"},
        timeout=60,
    )
    return resp.status_code in (200, 204, 404)


async def save_file(file: UploadFile, recording_id: int) -> str:
    """Save uploaded file to local storage. Returns the relative file path."""
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename or "audio").suffix
    filename = f"{recording_id}_{uuid.uuid4().hex[:8]}{ext}"
    file_path = UPLOADS_DIR / filename

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    return str(file_path)


def get_file_url(file_path: str) -> str:
    """Return a URL for accessing the file. MVP uses local path."""
    return f"/uploads/{os.path.basename(file_path)}"


def get_file_size(file_path: str) -> int:
    """Return file size in bytes."""
    return os.path.getsize(file_path)
