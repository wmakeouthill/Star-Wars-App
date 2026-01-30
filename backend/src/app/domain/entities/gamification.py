from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import List

from app.domain.enums.jedi_rank import JediRank

@dataclass
class Achievement:
    id: str
    name: str
    description: str
    xp_reward: int

@dataclass
class UserGamification:
    user_id: str
    total_xp: int = 0
    jedi_rank: JediRank = JediRank.YOUNGLING
    total_queries: int = 0
    chat_messages: int = 0
    created_at: datetime = field(default_factory=datetime.utcnow)
    achievements: List[Achievement] = field(default_factory=list)

    def add_xp(self, amount: int):
        if amount <= 0:
            return
        self.total_xp += amount
        self.jedi_rank = JediRank.from_xp(self.total_xp)

    def add_achievement(self, achievement: Achievement):
        if achievement.id not in [a.id for a in self.achievements]:
            self.achievements.append(achievement)
            self.add_xp(achievement.xp_reward)

    def record_query(self, xp_awarded: int) -> None:
        self.total_queries += 1
        self.add_xp(xp_awarded)

    def record_chat_message(self, xp_awarded: int) -> None:
        self.chat_messages += 1
        self.add_xp(xp_awarded)
