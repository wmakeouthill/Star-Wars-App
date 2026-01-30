from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException

from app.application.services.character_service import CharacterService
from app.application.services.gamification_service import GamificationService
from app.domain.exceptions.not_found import ResourceNotFoundError
from app.domain.schemas.character import CharacterFilter, CharacterResponse
from app.domain.schemas.common import PaginatedResponse
from app.interfaces.api.v1.dependencies.auth import get_current_user_id
from app.interfaces.api.v1.dependencies.services import get_character_service
from app.interfaces.api.v1.dependencies.services import get_gamification_service

router = APIRouter(prefix="/characters", tags=["Characters"])


@router.get("/", response_model=PaginatedResponse[CharacterResponse])
async def list_characters(
    name: Optional[str] = Query(None, description="Filtrar por nome"),
    gender: Optional[str] = Query(None, description="Filtrar por gênero"),
    homeworld: Optional[str] = Query(None, description="ID do planeta natal"),
    film_id: Optional[str] = Query(None, description="ID do filme"),
    min_height: Optional[int] = Query(None, ge=0),
    max_height: Optional[int] = Query(None, le=500),
    sort_by: Optional[str] = Query(None, pattern="^(name|height|mass)$"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    service: CharacterService = Depends(get_character_service),
    gamification: GamificationService = Depends(get_gamification_service),
    user_id: str = Depends(get_current_user_id),
):
    filters = CharacterFilter(
        name=name,
        gender=gender,
        homeworld=homeworld,
        film_id=film_id,
        min_height=min_height,
        max_height=max_height,
    )
    result = await service.list_characters(filters, sort_by, sort_order, page, page_size)
    gamification.record_query(user_id, 5)
    return result


@router.get("/{character_id}", response_model=CharacterResponse)
async def get_character(
    character_id: str,
    include_relations: bool = Query(True),
    service: CharacterService = Depends(get_character_service),
    gamification: GamificationService = Depends(get_gamification_service),
    user_id: str = Depends(get_current_user_id),
):
    try:
        result = await service.get_character(character_id, include_relations)
        gamification.record_query(user_id, 2)
        return result
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
