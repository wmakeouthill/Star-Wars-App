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
from app.infrastructure.db.models.quiz_result import QuizResult

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
        return [
            Achievement(
                id=str(r.id),  # cast obrigatório para evitar UUID vs str
                name=str(r.name),
                description=str(r.description),
                xp_reward=int(r.xp_reward or 0),
            )
            for r in rows
        ]

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
        """
        Registra uma consulta/query do usuário e concede XP.
        Falha silenciosamente se houver problemas com o banco (FK violation, etc).
        """
        try:
            user_uuid = self._try_parse_user_uuid(user_id)
            if user_uuid is None:
                return []

            row = self._ensure_user_row(user_uuid, db)
            row.total_queries += 1
            row.total_xp += max(0, int(xp_awarded))
            row.jedi_rank = JediRank.from_xp(int(row.total_xp)).value

            # Busca contagem de mensagens por persona para regras de conquista
            chat_stats = self.get_chat_stats_by_persona(user_id, db)
            unlocked = self._apply_achievement_rules(user_uuid, row, db, chat_stats=chat_stats)
            db.commit()
            return unlocked
        except Exception:
            # Falha silenciosamente para não bloquear a resposta da API
            # Possíveis causas: FK violation (usuário não existe), tabela não existe, etc
            db.rollback()
            return []

    def record_chat_message(self, user_id: str, xp_awarded: int, db: Session, persona: str = "yoda") -> List[Achievement]:
        """
        Registra uma mensagem de chat do usuário e concede XP.
        Falha silenciosamente se houver problemas com o banco.

        Args:
            persona: 'yoda' ou 'vader' - determina qual conquista pode ser desbloqueada.
        """
        try:
            user_uuid = self._try_parse_user_uuid(user_id)
            if user_uuid is None:
                return []

            row = self._ensure_user_row(user_uuid, db)
            row.chat_messages += 1
            row.total_xp += max(0, int(xp_awarded))
            row.jedi_rank = JediRank.from_xp(int(row.total_xp)).value

            # Busca contagem de mensagens por persona para regras de conquista
            chat_stats = self.get_chat_stats_by_persona(user_id, db)
            unlocked = self._apply_achievement_rules(user_uuid, row, db, chat_stats=chat_stats)
            db.commit()
            return unlocked
        except Exception:
            db.rollback()
            return []

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
        chat_stats: dict | None = None,
    ) -> List[Achievement]:
        """
        Regras atuais (MVP):
        - primeiro_contato: total_queries + chat_messages >= 1
        - amigo_yoda: yoda_messages >= 5 (mensagens específicas para Yoda)
        - lacaio_vader: vader_messages >= 5 (mensagens específicas para Vader)
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

        # Conquistas baseadas em mensagens por persona
        yoda_messages = chat_stats.get("yoda_messages", 0) if chat_stats else 0
        vader_messages = chat_stats.get("vader_messages", 0) if chat_stats else 0

        if yoda_messages >= 5:
            unlock("amigo_yoda")
        if vader_messages >= 5:
            unlock("lacaio_vader")

        if int(row.total_queries) >= 10:
            unlock("explorador")

        return unlocked_now

    # ────────────────────────────────────────────────────────────────────
    # Quiz
    # ────────────────────────────────────────────────────────────────────

    def record_quiz_result(
        self,
        user_id: str,
        score: int,
        correct_answers: int,
        total_questions: int,
        categories: List[str],
        db: Session,
    ) -> dict:
        """
        Registra resultado de quiz para usuário autenticado e concede XP.
        Retorna dict com dados do resultado incluindo xp_earned.
        """
        user_uuid = self._try_parse_user_uuid(user_id)
        if user_uuid is None:
            raise ValueError("Apenas usuários autenticados podem registrar quiz.")

        # XP: 10 por resposta correta
        xp_earned = max(0, int(correct_answers)) * 10

        result = QuizResult(
            user_id=user_uuid,
            score=max(0, int(score)),
            correct_answers=max(0, int(correct_answers)),
            total_questions=max(1, int(total_questions)),
            categories=",".join(categories) if categories else "",
            xp_earned=xp_earned,
        )
        db.add(result)
        db.flush()

        # Atualiza XP do usuário
        row = self._ensure_user_row(user_uuid, db)
        row.total_xp += xp_earned
        row.jedi_rank = JediRank.from_xp(int(row.total_xp)).value

        self._apply_achievement_rules(user_uuid, row, db)
        db.commit()

        return {
            "id": str(result.id),
            "user_id": str(result.user_id),
            "score": result.score,
            "correct_answers": result.correct_answers,
            "total_questions": result.total_questions,
            "categories": categories,
            "xp_earned": xp_earned,
            "played_at": result.played_at.isoformat() if result.played_at else "",
        }

    def get_chat_stats_by_persona(self, user_id: str, db: Session) -> dict:
        """
        Retorna contagem de mensagens do usuário (role=user) por persona (yoda/vader).
        """
        from app.infrastructure.db.models.chat import ChatConversation, ChatMessageModel

        user_uuid = self._try_parse_user_uuid(user_id)
        if user_uuid is None:
            return {"yoda_messages": 0, "vader_messages": 0, "total_messages": 0}

        # Query para contar mensagens do usuário agrupadas por persona da conversa
        from sqlalchemy import func as sqlfunc

        rows = db.execute(
            select(
                ChatConversation.persona,
                sqlfunc.count(ChatMessageModel.id).label("count"),
            )
            .join(ChatMessageModel, ChatMessageModel.conversation_id == ChatConversation.id)
            .where(ChatConversation.user_id == user_uuid)
            .where(ChatMessageModel.role == "user")
            .group_by(ChatConversation.persona)
        ).all()

        yoda_count = 0
        vader_count = 0
        for row in rows:
            if row.persona == "yoda":
                yoda_count = int(row.count)
            elif row.persona == "vader":
                vader_count = int(row.count)

        return {
            "yoda_messages": yoda_count,
            "vader_messages": vader_count,
            "total_messages": yoda_count + vader_count,
        }

    def get_quiz_leaderboard(self, db: Session, limit: int = 10) -> List[dict]:
        """
        Retorna ranking de quiz agregando por usuário:
        - best_score: maior score de uma única sessão
        - total_quizzes: quantidade de quizzes jogados
        - total_correct / total_questions: para calcular accuracy
        """
        from sqlalchemy import func as sqlfunc

        limit = max(1, min(100, int(limit)))

        # Subquery agregando por user_id
        subq = (
            select(
                QuizResult.user_id,
                sqlfunc.max(QuizResult.score).label("best_score"),
                sqlfunc.count(QuizResult.id).label("total_quizzes"),
                sqlfunc.sum(QuizResult.correct_answers).label("total_correct"),
                sqlfunc.sum(QuizResult.total_questions).label("total_questions"),
            )
            .group_by(QuizResult.user_id)
            .subquery()
        )

        from app.infrastructure.db.models.user import User

        rows = db.execute(
            select(subq, User.name, User.picture)
            .join(User, User.id == subq.c.user_id, isouter=True)
            .order_by(desc(subq.c.best_score))
            .limit(limit)
        ).all()

        result: List[dict] = []
        for r in rows:
            total_q = int(r.total_questions or 0)
            total_c = int(r.total_correct or 0)
            accuracy = round((total_c / total_q * 100) if total_q > 0 else 0, 1)
            result.append(
                {
                    "user_id": str(r.user_id),
                    "best_score": int(r.best_score or 0),
                    "total_quizzes": int(r.total_quizzes or 0),
                    "total_correct": total_c,
                    "total_questions": total_q,
                    "accuracy": accuracy,
                    "name": r.name,
                    "picture": r.picture,
                }
            )
        return result

    def get_quiz_history(self, user_id: str, db: Session, limit: int = 20) -> List[dict]:
        """
        Retorna histórico de quizzes do usuário ordenado por data (mais recentes primeiro).
        """
        user_uuid = self._try_parse_user_uuid(user_id)
        if user_uuid is None:
            return []

        limit = max(1, min(100, int(limit)))

        rows = db.scalars(
            select(QuizResult)
            .where(QuizResult.user_id == user_uuid)
            .order_by(desc(QuizResult.played_at))
            .limit(limit)
        ).all()

        result: List[dict] = []
        for r in rows:
            total_q = int(r.total_questions or 0)
            correct = int(r.correct_answers or 0)
            accuracy = round((correct / total_q * 100) if total_q > 0 else 0, 1)
            categories = (r.categories or "").split(",") if r.categories else []
            result.append(
                {
                    "id": str(r.id),
                    "score": int(r.score or 0),
                    "correct_answers": correct,
                    "total_questions": total_q,
                    "categories": [c.strip() for c in categories if c.strip()],
                    "xp_earned": int(r.xp_earned or 0),
                    "played_at": r.played_at.isoformat() if r.played_at else "",
                    "accuracy": accuracy,
                }
            )
        return result
