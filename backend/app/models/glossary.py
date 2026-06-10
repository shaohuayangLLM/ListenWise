from sqlalchemy import String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class Glossary(Base, TimestampMixin):
    """热词词表（全局单行）：转写时同步为百炼热词，订正时作为 LLM 参照词表。"""

    __tablename__ = "glossary"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    terms: Mapped[list] = mapped_column(JSONB, default=list)  # ["千问", "硅基流动", ...]
    # 百炼侧词表同步状态：vocabulary_id 绑定 target_model，terms/model 变更后重新同步
    vocabulary_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    target_model: Mapped[str | None] = mapped_column(String(50), nullable=True)
    synced_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
