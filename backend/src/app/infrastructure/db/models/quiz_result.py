from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.db.base import Base


class QuizResult(Base):
    """Armazena resultados de quizzes concluídos por usuários autenticados."""

    __tablename__ = "quiz_results"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )

    # Métricas do quiz
    score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    correct_answers: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_questions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Categorias selecionadas (armazenadas como string separada por vírgula)
    categories: Mapped[str] = mapped_column(String(400), nullable=True)

    # XP ganho nesta sessão
    xp_earned: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Timestamps
    played_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        Index("ix_quiz_results_user_score", "user_id", "score"),
        Index("ix_quiz_results_played_at", "played_at"),
    )
