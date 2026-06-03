"""模型设置 API：按能力维度读写 Provider 配置 + 连接测试。"""

import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Capability
from app.services import provider_config
from app.services.crypto import decrypt, mask

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/settings", tags=["settings"])

# 仅暴露 P0 涉及的能力（翻译属 P2）
EXPOSED = [Capability.asr, Capability.llm]


class ProviderConfigIn(BaseModel):
    provider: str
    model: str
    api_key: str | None = None  # None 表示不改动既有密钥
    base_url: str | None = None
    enabled: bool = True


class ProviderConfigOut(BaseModel):
    capability: str
    provider: str
    model: str
    base_url: str | None
    enabled: bool
    api_key_masked: str
    configured: bool


def _to_out(capability: Capability, row) -> ProviderConfigOut:
    if row is None:
        return ProviderConfigOut(
            capability=capability.value, provider="", model="",
            base_url=None, enabled=False, api_key_masked="", configured=False,
        )
    key = decrypt(row.api_key_encrypted)
    return ProviderConfigOut(
        capability=capability.value, provider=row.provider, model=row.model,
        base_url=row.base_url, enabled=row.enabled,
        api_key_masked=mask(key), configured=bool(key),
    )


@router.get("/providers")
async def list_providers(db: AsyncSession = Depends(get_db)) -> list[ProviderConfigOut]:
    out = []
    for cap in EXPOSED:
        row = await provider_config.get_config(db, cap)
        out.append(_to_out(cap, row))
    return out


@router.put("/providers/{capability}")
async def update_provider(
    capability: Capability, body: ProviderConfigIn, db: AsyncSession = Depends(get_db)
) -> ProviderConfigOut:
    if capability not in EXPOSED:
        raise HTTPException(400, "暂不支持该能力的配置")
    row = await provider_config.upsert_config(
        db, capability, provider=body.provider, model=body.model,
        api_key=body.api_key, base_url=body.base_url, enabled=body.enabled,
    )
    return _to_out(capability, row)


@router.post("/providers/{capability}/test")
async def test_provider(capability: Capability, db: AsyncSession = Depends(get_db)):
    """连接测试（F0.4）：解析配置后做一次轻量探活。"""
    row = await provider_config.get_config(db, capability)
    cfg = provider_config._from_row(row) if row else None
    if cfg is None:
        cfg = provider_config._env_fallback(capability)
    if cfg is None or not cfg.api_key:
        raise HTTPException(400, "尚未配置密钥")

    if capability == Capability.llm:
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                r = await client.post(
                    f"{(cfg.base_url or '').rstrip('/')}/chat/completions",
                    headers={"Authorization": f"Bearer {cfg.api_key}"},
                    json={
                        "model": cfg.model,
                        "messages": [{"role": "user", "content": "ping"}],
                        "max_tokens": 1,
                    },
                )
            if r.status_code == 200:
                return {"ok": True, "message": "连接正常"}
            return {"ok": False, "message": f"探活失败（HTTP {r.status_code}）"}
        except Exception as e:  # noqa: BLE001
            return {"ok": False, "message": f"连接失败：{e}"}

    # ASR：百炼无轻量 ping 接口，真实效果在首次转写时验证
    return {"ok": True, "message": "密钥已配置（ASR 真实效果将在首次转写时验证）"}
