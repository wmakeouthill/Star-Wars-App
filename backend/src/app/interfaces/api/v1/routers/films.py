from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.application.services.film_service import FilmService
from app.application.services.character_service import CharacterService
from app.application.services.gamification_service import GamificationService
from app.domain.exceptions.not_found import ResourceNotFoundError
from app.domain.schemas.common import PaginatedResponse
from app.domain.schemas.character import CharacterResponse
from app.domain.schemas.film import FilmFilter, FilmResponse
from app.infrastructure.db.session import get_db
from app.interfaces.api.v1.dependencies.auth import get_current_user_id
from app.interfaces.api.v1.dependencies.services import get_film_service, get_character_service
from app.interfaces.api.v1.dependencies.services import get_gamification_service

router = APIRouter(prefix="/films", tags=["Films"])


@router.get("", response_model=PaginatedResponse[FilmResponse])
async def list_films(
    title: Optional[str] = Query(None, description="Filtrar por título"),
    director: Optional[str] = Query(None, description="Filtrar por diretor"),
    producer: Optional[str] = Query(None, description="Filtrar por produtor"),
    sort_by: Optional[str] = Query(None, pattern="^(title|episode_id)$"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    service: FilmService = Depends(get_film_service),
    gamification: GamificationService = Depends(get_gamification_service),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    filters = FilmFilter(title=title, director=director, producer=producer)
    result = await service.list_films(filters, sort_by, sort_order, page, page_size)
    gamification.record_query(user_id, 5, db)
    return result


@router.get("/{film_id}", response_model=FilmResponse)
async def get_film(
    film_id: str,
    include_relations: bool = Query(False, description="Incluir relações resolvidas (planetas/naves/veículos/espécies)"),
    service: FilmService = Depends(get_film_service),
    gamification: GamificationService = Depends(get_gamification_service),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    try:
        result = (
            await service.get_film_with_relations(film_id)
            if include_relations
            else await service.get_film(film_id)
        )
        gamification.record_query(user_id, 2, db)
        return result
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/{film_id}/characters", response_model=PaginatedResponse[CharacterResponse])
async def list_characters_by_film(
    film_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    service: CharacterService = Depends(get_character_service),
    gamification: GamificationService = Depends(get_gamification_service),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    try:
        result = await service.list_characters_by_film(film_id, page, page_size)
        gamification.record_query(user_id, 10, db)
        return result
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
