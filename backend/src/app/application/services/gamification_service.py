from __future__ import annotations

from dataclasses import asdict
from datetime import date
from typing import Dict, List, Tuple

from app.domain.entities.gamification import Achievement, UserGamification

class GamificationService:
    def __init__(self):
        self._users: Dict[str, UserGamification] = {}
        self._achievements: Dict[str, Achievement] = {}
        self._daily_progress: Dict[Tuple[str, str], int] = {}
        self._daily_completed: set[Tuple[str, str]] = set()

        self._register_default_achievements()

    def _register_default_achievements(self) -> None:
        # MVP: conjunto pequeno (expandimos depois conforme as regras do planejamento)
        defaults = [
            Achievement(
                id="primeiro_contato",
                name="Primeiro Contato",
                description="Sua primeira interação com o Holocron.",
                xp_reward=25,
            ),
            Achievement(
                id="amigo_yoda",
                name="Amigo do Yoda",
                description="Envie 5 mensagens ao Mestre Yoda.",
                xp_reward=50,
            ),
            Achievement(
                id="explorador",
                name="Explorador da Galáxia",
                description="Realize 10 consultas aos arquivos do Holocron.",
                xp_reward=50,
            ),
        ]
        for a in defaults:
            self.register_achievement(a)

    def get_user_gamification(self, user_id: str) -> UserGamification:
        if user_id not in self._users:
            self._users[user_id] = UserGamification(user_id=user_id)
        return self._users[user_id]

    def get_user_profile(self, user_id: str) -> UserGamification:
        return self.get_user_gamification(user_id)

    def record_query(self, user_id: str, xp_awarded: int) -> List[Achievement]:
        user = self.get_user_gamification(user_id)
        user.record_query(xp_awarded)
        return self._check_achievements(user)

    def record_chat_message(self, user_id: str, xp_awarded: int) -> List[Achievement]:
        user = self.get_user_gamification(user_id)
        user.record_chat_message(xp_awarded)
        unlocked = self._check_achievements(user)
        self._maybe_apply_daily_challenge(user_id)
        return unlocked

    def add_achievement(self, user_id: str, achievement_id: str):
        user = self.get_user_gamification(user_id)
        achievement = self._achievements.get(achievement_id)
        if achievement:
            user.add_achievement(achievement)

    def register_achievement(self, achievement: Achievement):
        self._achievements[achievement.id] = achievement

    def list_achievements(self) -> List[Achievement]:
        return list(self._achievements.values())

    def get_leaderboard(self, limit: int = 10) -> List[UserGamification]:
        users = list(self._users.values())
        users.sort(key=lambda u: u.total_xp, reverse=True)
        return users[: max(1, limit)]

    def get_achievements_for_user(self, user_id: str) -> List[dict]:
        """
        Retorna todas as conquistas com status unlocked.
        MVP: formato em dict para facilitar o router (sem criar mais entidades).
        """
        user = self.get_user_gamification(user_id)
        unlocked_ids = {a.id for a in user.achievements}
        result: List[dict] = []
        for a in self.list_achievements():
            payload = asdict(a)
            payload["unlocked"] = a.id in unlocked_ids
            result.append(payload)
        return result

    def get_daily_challenge(self, user_id: str) -> dict:
        """
        MVP: desafio diário único baseado em chat.
        """
        today = date.today().isoformat()
        challenge_id = f"daily_chat_{today}"
        target = 3
        key = (user_id, today)
        progress = self._daily_progress.get(key, 0)
        completed = key in self._daily_completed
        return {
            "id": challenge_id,
            "title": "Desafio Diário",
            "description": f"Envie {target} mensagens ao Mestre Yoda hoje.",
            "xp_reward": 30,
            "completed": completed,
            "progress_current": progress,
            "progress_target": target,
        }

    def _maybe_apply_daily_challenge(self, user_id: str) -> None:
        today = date.today().isoformat()
        key = (user_id, today)
        if key in self._daily_completed:
            return

        # Progresso: chat_messages do dia (MVP simplificado: apenas contador incremental)
        progress = self._daily_progress.get(key, 0) + 1
        self._daily_progress[key] = progress

        target = 3
        if progress >= target:
            self._daily_completed.add(key)
            # Recompensa única
            self.get_user_gamification(user_id).add_xp(30)

    def _check_achievements(self, user: UserGamification) -> List[Achievement]:
        unlocked: List[Achievement] = []

        def unlock(achievement_id: str) -> None:
            a = self._achievements.get(achievement_id)
            if not a:
                return
            before = {x.id for x in user.achievements}
            user.add_achievement(a)
            after = {x.id for x in user.achievements}
            if after != before:
                unlocked.append(a)

        if user.total_queries + user.chat_messages >= 1:
            unlock("primeiro_contato")
        if user.chat_messages >= 5:
            unlock("amigo_yoda")
        if user.total_queries >= 10:
            unlock("explorador")

        return unlocked
