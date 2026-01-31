from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field

from app.domain.enums.jedi_rank import JediRank

class AchievementSchema(BaseModel):
    id: str
    name: str
    description: str
    xp_reward: int


class AchievementStatusSchema(AchievementSchema):
    unlocked: bool = False

class UserGamificationSchema(BaseModel):
    user_id: str
    name: Optional[str] = None
    picture: Optional[str] = None
    total_xp: int = 0
    jedi_rank: JediRank = JediRank.YOUNGLING
    total_queries: int = 0
    chat_messages: int = 0
    achievements: List[AchievementSchema] = Field(default_factory=list)


class LeaderboardEntrySchema(BaseModel):
    user_id: str
    total_xp: int
    jedi_rank: JediRank
    name: Optional[str] = None
    picture: Optional[str] = None


class LeaderboardEntryDetailedSchema(LeaderboardEntrySchema):
    """Entrada detalhada do leaderboard com estatísticas extras."""
    
    total_queries: int = 0
    chat_messages: int = 0
    achievements_count: int = 0
    total_quizzes: int = 0


class DailyChallengeSchema(BaseModel):
    id: str
    title: str
    description: str
    xp_reward: int
    completed: bool = False
    progress_current: Optional[int] = None
    progress_target: Optional[int] = None


# ────────────────────────────────────────────────────────────────────
# Quiz
# ────────────────────────────────────────────────────────────────────

class QuizResultCreateSchema(BaseModel):
    """Payload enviado pelo frontend ao concluir um quiz."""

    score: int = Field(..., ge=0, description="Quantidade de respostas corretas")
    correct_answers: int = Field(..., ge=0)
    total_questions: int = Field(..., ge=1)
    categories: List[str] = Field(default_factory=list, description="Categorias jogadas")


class QuizResultSchema(BaseModel):
    """Quiz result retornado após registro."""

    id: str
    user_id: str
    score: int
    correct_answers: int
    total_questions: int
    categories: List[str]
    xp_earned: int
    played_at: str


class QuizLeaderboardEntrySchema(BaseModel):
    """Entrada do ranking de quiz."""

    user_id: str
    best_score: int
    total_quizzes: int
    total_correct: int
    total_questions: int
    accuracy: float = Field(..., description="Percentual de acerto geral")
    name: Optional[str] = None
    picture: Optional[str] = None


class QuizHistoryEntrySchema(BaseModel):
    """Entrada do histórico de quiz do usuário."""

    id: str
    score: int
    correct_answers: int
    total_questions: int
    categories: List[str]
    xp_earned: int
    played_at: str
    accuracy: float = Field(..., description="Percentual de acerto")
