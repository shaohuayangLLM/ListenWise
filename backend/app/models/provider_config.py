from sqlalchemy import Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import Capability, TimestampMixin


class ModelProviderConfig(Base, TimestampMixin):
    """按能力维度保存的公有云 API 配置（D1）。

    MVP 单用户、单租户：每个 capability 全局一条配置（capability 唯一）。
    api_key 加密存储，不存明文。
    """

    __tablename__ = "model_provider_configs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    capability: Mapped[Capability] = mapped_column(unique=True)
    provider: Mapped[str] = mapped_column(String(50))
    api_key_encrypted: Mapped[str] = mapped_column(Text, default="")
    base_url: Mapped[str | None] = mapped_column(String(300), nullable=True)
    model: Mapped[str] = mapped_column(String(100), default="")
    region: Mapped[str | None] = mapped_column(String(50), nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
