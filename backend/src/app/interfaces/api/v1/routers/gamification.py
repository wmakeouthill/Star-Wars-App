from fastapi import APIRouter, Depends

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

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
from app.infrastructure.db.models.gamification import UserGamificationModel
from app.infrastructure.db.models.user import User
from app.infrastructure.db.session import get_db

router = APIRouter(prefix="/gamification", tags=["Gamificação"])


@router.get("/profile", response_model=UserGamificationSchema)
def get_profile(
    service: GamificationService = Depends(get_gamification_service),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    user = service.get_user_profile(user_id, db)
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
    db: Session = Depends(get_db),
):
    # Retorna o ranking com dados opcionais do usuário (nome/foto) quando existir login Google.
    # Para usuários sem perfil (ex.: entradas legacy), `name/picture` podem vir como null.
    limit = max(1, int(limit))
    rows = db.execute(
        select(UserGamificationModel, User)
        .join(User, User.id == UserGamificationModel.user_id, isouter=True)
        .order_by(desc(UserGamificationModel.total_xp))
        .limit(limit)
    ).all()
    return [
        LeaderboardEntrySchema(
            user_id=str(g.user_id),
            total_xp=int(g.total_xp),
            jedi_rank=g.jedi_rank,
            name=(u.name if u else None),
            picture=(u.picture if u else None),
        )
        for (g, u) in rows
    ]


@router.get("/achievements", response_model=list[AchievementStatusSchema])
def list_achievements(
    service: GamificationService = Depends(get_gamification_service),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return [AchievementStatusSchema(**a) for a in service.get_achievements_for_user(user_id, db)]


@router.get("/daily-challenge", response_model=DailyChallengeSchema)
def get_daily_challenge(
    service: GamificationService = Depends(get_gamification_service),
    user_id: str = Depends(get_current_user_id),
):
    return DailyChallengeSchema(**service.get_daily_challenge(user_id))
