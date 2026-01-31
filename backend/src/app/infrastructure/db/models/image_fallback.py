from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, Text, UniqueConstraint, func, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.db.base import Base


class ImageFallback(Base):
    """
    Fallback de imagens por recurso do Databank/SWAPI.

    - `resource`: catálogo (ex.: characters, locations, starships, vehicles, species, films)
    - Lookup por nome normalizado (casefold) para casar com SWAPI/Databank.
    """

    __tablename__ = "image_fallbacks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    resource: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    item_name: Mapped[str] = mapped_column(String(200), nullable=False)
    item_name_norm: Mapped[str] = mapped_column(String(220), nullable=False)
    image_url: Mapped[str] = mapped_column(Text, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        UniqueConstraint("resource", "item_name_norm", name="uq_image_fallbacks_resource_name_norm"),
        Index("ix_image_fallbacks_resource_name_norm", "resource", "item_name_norm", unique=True),
        Index("ix_image_fallbacks_resource_item_name", "resource", "item_name"),
    )

