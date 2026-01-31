import uuid

from fastapi import APIRouter, Depends

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.application.services.gamification_service import GamificationService
from app.domain.schemas.gamification import (
    AchievementSchema,
    AchievementStatusSchema,
    DailyChallengeSchema,
    LeaderboardEntryDetailedSchema,
    LeaderboardEntrySchema,
    QuizHistoryEntrySchema,
    QuizLeaderboardEntrySchema,
    QuizResultCreateSchema,
    QuizResultSchema,
    UserGamificationSchema,
)
from app.interfaces.api.v1.dependencies.auth import get_current_user_id, require_authenticated_user_id
from app.interfaces.api.v1.dependencies.services import get_gamification_service
from app.infrastructure.db.models.gamification import UserAchievementModel, UserGamificationModel
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

    # Enriquecimento: nome/foto do usuário autenticado (Google), quando existir.
    name = None
    picture = None
    try:
        user_uuid = uuid.UUID(str(user.user_id))
        u = db.get(User, user_uuid)
        if u:
            name = u.name
            picture = u.picture
    except Exception:
        # usuário guest / sem UUID
        pass

    return UserGamificationSchema(
        user_id=user.user_id,
        name=name,
        picture=picture,
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


@router.get("/leaderboard-detailed", response_model=list[LeaderboardEntryDetailedSchema])
def get_leaderboard_detailed(
    limit: int = 50,
    service: GamificationService = Depends(get_gamification_service),
    db: Session = Depends(get_db),
):
    """
    Retorna o ranking detalhado com estatísticas extras (consultas, chat, conquistas, quizzes).
    """
    from sqlalchemy import func as sqlfunc
    from app.infrastructure.db.models.quiz_result import QuizResult

    limit = max(1, min(100, int(limit)))

    # Subquery para contar conquistas por usuário
    achievements_subq = (
        select(
            UserAchievementModel.user_id,
            sqlfunc.count(UserAchievementModel.achievement_id).label("achievements_count"),
        )
        .group_by(UserAchievementModel.user_id)
        .subquery()
    )

    # Subquery para contar quizzes por usuário
    quizzes_subq = (
        select(
            QuizResult.user_id,
            sqlfunc.count(QuizResult.id).label("total_quizzes"),
        )
        .group_by(QuizResult.user_id)
        .subquery()
    )

    # Query principal com joins
    rows = db.execute(
        select(
            UserGamificationModel,
            User,
            sqlfunc.coalesce(achievements_subq.c.achievements_count, 0).label("achievements_count"),
            sqlfunc.coalesce(quizzes_subq.c.total_quizzes, 0).label("total_quizzes"),
        )
        .join(User, User.id == UserGamificationModel.user_id, isouter=True)
        .join(achievements_subq, achievements_subq.c.user_id == UserGamificationModel.user_id, isouter=True)
        .join(quizzes_subq, quizzes_subq.c.user_id == UserGamificationModel.user_id, isouter=True)
        .order_by(desc(UserGamificationModel.total_xp))
        .limit(limit)
    ).all()

    return [
        LeaderboardEntryDetailedSchema(
            user_id=str(g.user_id),
            total_xp=int(g.total_xp),
            jedi_rank=g.jedi_rank,
            name=(u.name if u else None),
            picture=(u.picture if u else None),
            total_queries=int(g.total_queries),
            chat_messages=int(g.chat_messages),
            achievements_count=int(row.achievements_count),
            total_quizzes=int(row.total_quizzes),
        )
        for (g, u, row) in [(r[0], r[1], r) for r in rows]
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


@router.get("/chat-stats")
def get_chat_stats(
    service: GamificationService = Depends(get_gamification_service),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Retorna estatísticas de chat separadas por persona (Yoda/Vader).
    """
    return service.get_chat_stats_by_persona(user_id, db)


# ────────────────────────────────────────────────────────────────────
# Quiz
# ────────────────────────────────────────────────────────────────────


@router.post("/quiz-result", response_model=QuizResultSchema)
def submit_quiz_result(
    payload: QuizResultCreateSchema,
    service: GamificationService = Depends(get_gamification_service),
    user_id: str = Depends(require_authenticated_user_id),
    db: Session = Depends(get_db),
):
    """
    Registra resultado de quiz para usuários autenticados (Google).
    Concede XP baseado em respostas corretas.
    """
    result = service.record_quiz_result(
        user_id=user_id,
        score=payload.score,
        correct_answers=payload.correct_answers,
        total_questions=payload.total_questions,
        categories=payload.categories,
        db=db,
    )
    return QuizResultSchema(**result)


@router.get("/quiz-leaderboard", response_model=list[QuizLeaderboardEntrySchema])
def get_quiz_leaderboard(
    limit: int = 10,
    service: GamificationService = Depends(get_gamification_service),
    db: Session = Depends(get_db),
):
    """
    Ranking de quiz ordenado por melhor score.
    Qualquer usuário pode consultar (não requer autenticação).
    """
    rows = service.get_quiz_leaderboard(db, limit=limit)
    return [QuizLeaderboardEntrySchema(**r) for r in rows]


@router.get("/quiz-history", response_model=list[QuizHistoryEntrySchema])
def get_quiz_history(
    limit: int = 20,
    service: GamificationService = Depends(get_gamification_service),
    user_id: str = Depends(require_authenticated_user_id),
    db: Session = Depends(get_db),
):
    """
    Histórico de quizzes do usuário autenticado, ordenado por data (mais recentes primeiro).
    """
    rows = service.get_quiz_history(user_id, db, limit=limit)
    return [QuizHistoryEntrySchema(**r) for r in rows]
