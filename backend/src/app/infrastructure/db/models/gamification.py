from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.domain.enums.jedi_rank import JediRank
from app.infrastructure.db.base import Base


class AchievementModel(Base):
    __tablename__ = "achievements"

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    xp_reward: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class UserGamificationModel(Base):
    __tablename__ = "user_gamification"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    total_xp: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_queries: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    chat_messages: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    jedi_rank: Mapped[str] = mapped_column(String(40), nullable=False, default=JediRank.YOUNGLING.value)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class UserAchievementModel(Base):
    __tablename__ = "user_achievements"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    achievement_id: Mapped[str] = mapped_column(String(80), ForeignKey("achievements.id"), primary_key=True)
    unlocked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "achievement_id", name="uq_user_achievements_user_achievement"),
    )

