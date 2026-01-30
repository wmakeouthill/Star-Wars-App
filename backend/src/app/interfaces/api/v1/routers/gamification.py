from fastapi import APIRouter, Depends

from app.application.services.gamification_service import GamificationService
from app.domain.schemas.gamification import (
    AchievementSchema,
    AchievementStatusSchema,
    DailyChallengeSchema,
    LeaderboardEntrySchema,
    UserGamificationSchema,
)
from app.interfaces.api.v1.dependencies.auth import get_current_user_id
from app.interfaces.api.v1.dependencies.services import get_gamification_service

router = APIRouter(prefix="/gamification", tags=["Gamificação"])


@router.get("/profile", response_model=UserGamificationSchema)
def get_profile(
    service: GamificationService = Depends(get_gamification_service),
    user_id: str = Depends(get_current_user_id),
):
    user = service.get_user_profile(user_id)
    return UserGamificationSchema(
        user_id=user.user_id,
        total_xp=user.total_xp,
        jedi_rank=user.jedi_rank,
        total_queries=user.total_queries,
        chat_messages=user.chat_messages,
        achievements=[AchievementSchema(**a.__dict__) for a in user.achievements],
    )


@router.get("/leaderboard", response_model=list[LeaderboardEntrySchema])
def get_leaderboard(
    limit: int = 10,
    service: GamificationService = Depends(get_gamification_service),
):
    users = service.get_leaderboard(limit=limit)
    return [
        LeaderboardEntrySchema(user_id=u.user_id, total_xp=u.total_xp, jedi_rank=u.jedi_rank) for u in users
    ]


@router.get("/achievements", response_model=list[AchievementStatusSchema])
def list_achievements(
    service: GamificationService = Depends(get_gamification_service),
    user_id: str = Depends(get_current_user_id),
):
    return [AchievementStatusSchema(**a) for a in service.get_achievements_for_user(user_id)]


@router.get("/daily-challenge", response_model=DailyChallengeSchema)
def get_daily_challenge(
    service: GamificationService = Depends(get_gamification_service),
    user_id: str = Depends(get_current_user_id),
):
    return DailyChallengeSchema(**service.get_daily_challenge(user_id))
