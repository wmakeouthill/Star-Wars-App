from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, Text, UniqueConstraint, func, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.db.base import Base


class CharacterImageFallback(Base):
    __tablename__ = "character_image_fallbacks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    character_name: Mapped[str] = mapped_column(String(200), nullable=False)
    character_name_norm: Mapped[str] = mapped_column(String(220), nullable=False, unique=True, index=True)
    image_url: Mapped[str] = mapped_column(Text, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        UniqueConstraint("character_name_norm", name="uq_character_image_fallbacks_name_norm"),
        Index("ix_character_image_fallbacks_name", "character_name"),
    )

