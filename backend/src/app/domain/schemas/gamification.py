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
    total_xp: int = 0
    jedi_rank: JediRank = JediRank.YOUNGLING
    total_queries: int = 0
    chat_messages: int = 0
    achievements: List[AchievementSchema] = Field(default_factory=list)


class LeaderboardEntrySchema(BaseModel):
    user_id: str
    total_xp: int
    jedi_rank: JediRank


class DailyChallengeSchema(BaseModel):
    id: str
    title: str
    description: str
    xp_reward: int
    completed: bool = False
    progress_current: Optional[int] = None
    progress_target: Optional[int] = None
