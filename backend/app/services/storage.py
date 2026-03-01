import os
import uuid
from pathlib import Path

from fastapi import UploadFile

UPLOADS_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"


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
