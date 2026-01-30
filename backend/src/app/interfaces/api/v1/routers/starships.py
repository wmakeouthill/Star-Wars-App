from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException

from app.application.services.starship_service import StarshipService
from app.application.services.gamification_service import GamificationService
from app.domain.exceptions.not_found import ResourceNotFoundError
from app.domain.schemas.common import PaginatedResponse
from app.domain.schemas.starship import StarshipFilter, StarshipResponse
from app.interfaces.api.v1.dependencies.auth import get_current_user_id
from app.interfaces.api.v1.dependencies.services import get_starship_service
from app.interfaces.api.v1.dependencies.services import get_gamification_service

router = APIRouter(prefix="/starships", tags=["Starships"])


@router.get("/", response_model=PaginatedResponse[StarshipResponse])
async def list_starships(
    name: Optional[str] = Query(None, description="Filtrar por nome"),
    manufacturer: Optional[str] = Query(None, description="Filtrar por fabricante"),
    starship_class: Optional[str] = Query(None, description="Filtrar por classe"),
    sort_by: Optional[str] = Query(None, pattern="^(name|crew)$"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    service: StarshipService = Depends(get_starship_service),
    gamification: GamificationService = Depends(get_gamification_service),
    user_id: str = Depends(get_current_user_id),
):
    filters = StarshipFilter(
        name=name,
        manufacturer=manufacturer,
        starship_class=starship_class,
    )
    result = await service.list_starships(filters, sort_by, sort_order, page, page_size)
    gamification.record_query(user_id, 5)
    return result


@router.get("/{starship_id}", response_model=StarshipResponse)
async def get_starship(
    starship_id: str,
    service: StarshipService = Depends(get_starship_service),
    gamification: GamificationService = Depends(get_gamification_service),
    user_id: str = Depends(get_current_user_id),
):
    try:
        result = await service.get_starship(starship_id)
        gamification.record_query(user_id, 2)
        return result
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
