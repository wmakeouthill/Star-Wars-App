from __future__ import annotations

from dataclasses import asdict
from datetime import date
from typing import List

import uuid

from sqlalchemy import select, desc
from sqlalchemy.orm import Session

from app.domain.entities.gamification import Achievement, UserGamification
from app.domain.enums.jedi_rank import JediRank
from app.infrastructure.db.models.gamification import AchievementModel, UserAchievementModel, UserGamificationModel

class GamificationService:
    def _try_parse_user_uuid(self, user_id: str) -> uuid.UUID | None:
        try:
            return uuid.UUID(str(user_id))
        except Exception:
            return None

    def _ensure_user_row(self, user_uuid: uuid.UUID, db: Session) -> UserGamificationModel:
        row = db.get(UserGamificationModel, user_uuid)
        if row is None:
            row = UserGamificationModel(user_id=user_uuid, total_xp=0, total_queries=0, chat_messages=0, jedi_rank=JediRank.YOUNGLING.value)
            db.add(row)
            db.flush()
        return row

    def _list_achievements(self, db: Session) -> List[Achievement]:
        rows = db.scalars(select(AchievementModel).order_by(AchievementModel.id)).all()
        return [Achievement(id=r.id, name=r.name, description=r.description, xp_reward=r.xp_reward) for r in rows]

    def _unlocked_ids(self, user_uuid: uuid.UUID, db: Session) -> set[str]:
        rows = db.scalars(select(UserAchievementModel.achievement_id).where(UserAchievementModel.user_id == user_uuid)).all()
        return set(rows)

    def get_user_profile(self, user_id: str, db: Session) -> UserGamification:
        user_uuid = self._try_parse_user_uuid(user_id)
        if user_uuid is None:
            return UserGamification(user_id=user_id)

        row = self._ensure_user_row(user_uuid, db)
        unlocked = self._unlocked_ids(user_uuid, db)
        achievements = [a for a in self._list_achievements(db) if a.id in unlocked]

        return UserGamification(
            user_id=str(row.user_id),
            total_xp=int(row.total_xp),
            jedi_rank=JediRank(row.jedi_rank),
            total_queries=int(row.total_queries),
            chat_messages=int(row.chat_messages),
            achievements=achievements,
        )

    def record_query(self, user_id: str, xp_awarded: int, db: Session) -> List[Achievement]:
        user_uuid = self._try_parse_user_uuid(user_id)
        if user_uuid is None:
            return []

        row = self._ensure_user_row(user_uuid, db)
        row.total_queries += 1
        row.total_xp += max(0, int(xp_awarded))
        row.jedi_rank = JediRank.from_xp(int(row.total_xp)).value

        unlocked = self._apply_achievement_rules(user_uuid, row, db)
        db.commit()
        return unlocked

    def record_chat_message(self, user_id: str, xp_awarded: int, db: Session) -> List[Achievement]:
        user_uuid = self._try_parse_user_uuid(user_id)
        if user_uuid is None:
            return []

        row = self._ensure_user_row(user_uuid, db)
        row.chat_messages += 1
        row.total_xp += max(0, int(xp_awarded))
        row.jedi_rank = JediRank.from_xp(int(row.total_xp)).value

        unlocked = self._apply_achievement_rules(user_uuid, row, db)
        db.commit()
        return unlocked

    def get_leaderboard(self, db: Session, limit: int = 10) -> List[UserGamification]:
        limit = max(1, int(limit))
        rows = db.scalars(
            select(UserGamificationModel).order_by(desc(UserGamificationModel.total_xp)).limit(limit)
        ).all()
        result: List[UserGamification] = []
        for r in rows:
            result.append(
                UserGamification(
                    user_id=str(r.user_id),
                    total_xp=int(r.total_xp),
                    jedi_rank=JediRank(r.jedi_rank),
                    total_queries=int(r.total_queries),
                    chat_messages=int(r.chat_messages),
                    achievements=[],
                )
            )
        return result

    def get_achievements_for_user(self, user_id: str, db: Session) -> List[dict]:
        user_uuid = self._try_parse_user_uuid(user_id)
        achievements = self._list_achievements(db)
        unlocked_ids = self._unlocked_ids(user_uuid, db) if user_uuid else set()
        result: List[dict] = []
        for a in achievements:
            payload = asdict(a)
            payload["unlocked"] = a.id in unlocked_ids
            result.append(payload)
        return result

    def get_daily_challenge(self, user_id: str) -> dict:
        """
        MVP: desafio diário único baseado em chat.

        Observação: por enquanto o progresso diário NÃO é persistido.
        Quando conectarmos com o histórico de mensagens, dá para calcular por data.
        """
        today = date.today().isoformat()
        challenge_id = f"daily_chat_{today}"
        target = 3
        _ = self._try_parse_user_uuid(user_id)
        return {
            "id": challenge_id,
            "title": "Desafio Diário",
            "description": f"Envie {target} mensagens ao Mestre Yoda hoje.",
            "xp_reward": 30,
            "completed": False,
            "progress_current": None,
            "progress_target": target,
        }

    def _apply_achievement_rules(
        self,
        user_uuid: uuid.UUID,
        row: UserGamificationModel,
        db: Session,
    ) -> List[Achievement]:
        """
        Regras atuais (MVP):
        - primeiro_contato: total_queries + chat_messages >= 1
        - amigo_yoda: chat_messages >= 5
        - explorador: total_queries >= 10
        """
        unlocked_now: List[Achievement] = []

        all_achievements = {a.id: a for a in self._list_achievements(db)}
        unlocked = self._unlocked_ids(user_uuid, db)

        def unlock(achievement_id: str) -> None:
            if achievement_id in unlocked:
                return
            a = all_achievements.get(achievement_id)
            if not a:
                return
            db.add(UserAchievementModel(user_id=user_uuid, achievement_id=achievement_id))
            unlocked.add(achievement_id)
            # bônus de XP da conquista
            row.total_xp += int(a.xp_reward)
            row.jedi_rank = JediRank.from_xp(int(row.total_xp)).value
            unlocked_now.append(a)

        if int(row.total_queries) + int(row.chat_messages) >= 1:
            unlock("primeiro_contato")
        if int(row.chat_messages) >= 5:
            unlock("amigo_yoda")
        if int(row.total_queries) >= 10:
            unlock("explorador")

        return unlocked_now
