"""按能力维度解析 Provider 配置（D1）。

优先读 DB 中 model_provider_configs（enabled 且有密钥），否则回退 .env 默认。
提供同步版（Celery 转写任务用）与异步版（API CRUD 用）。
"""

import logging
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Capability, ModelProviderConfig
from app.services.crypto import decrypt, encrypt

logger = logging.getLogger(__name__)


@dataclass
class ResolvedProvider:
    provider: str
    api_key: str
    base_url: str | None
    model: str


def _env_fallback(capability: Capability) -> ResolvedProvider | None:
    """无 DB 配置时的 .env 兜底。"""
    if capability == Capability.asr:
        if not settings.dashscope_api_key:
            return None
        provider = settings.asr_provider  # dashscope | fun_asr
        model = "fun-asr" if provider == "fun_asr" else settings.asr_model
        return ResolvedProvider(
            provider, settings.dashscope_api_key, settings.dashscope_base_url, model
        )
    if capability == Capability.llm:
        key = settings.llm_api_key or settings.dashscope_api_key
        if not key:
            return None
        return ResolvedProvider("qwen", key, settings.llm_base_url, settings.llm_model)
    return None


def _from_row(row: ModelProviderConfig) -> ResolvedProvider | None:
    if not row.enabled or not row.api_key_encrypted:
        return None
    api_key = decrypt(row.api_key_encrypted)
    if not api_key:
        return None
    return ResolvedProvider(row.provider, api_key, row.base_url, row.model)


def resolve_sync(db: Session, capability: Capability) -> ResolvedProvider | None:
    """同步解析（Celery 转写任务用）：DB 配置优先，否则 .env 兜底。"""
    row = db.execute(
        select(ModelProviderConfig).where(ModelProviderConfig.capability == capability)
    ).scalar_one_or_none()
    if row:
        resolved = _from_row(row)
        if resolved:
            return resolved
    return _env_fallback(capability)


async def get_config(db: AsyncSession, capability: Capability) -> ModelProviderConfig | None:
    res = await db.execute(
        select(ModelProviderConfig).where(ModelProviderConfig.capability == capability)
    )
    return res.scalar_one_or_none()


async def upsert_config(
    db: AsyncSession,
    capability: Capability,
    provider: str,
    model: str,
    api_key: str | None,
    base_url: str | None = None,
    region: str | None = None,
    enabled: bool = True,
) -> ModelProviderConfig:
    """新建或更新某能力的配置。api_key 为 None 表示不改动既有密钥。"""
    row = await get_config(db, capability)
    if row is None:
        row = ModelProviderConfig(capability=capability, provider=provider, model=model)
        db.add(row)
    row.provider = provider
    row.model = model
    row.base_url = base_url
    row.region = region
    row.enabled = enabled
    if api_key is not None:  # 仅在显式提供时覆盖密钥
        row.api_key_encrypted = encrypt(api_key)
    await db.commit()
    await db.refresh(row)
    return row
