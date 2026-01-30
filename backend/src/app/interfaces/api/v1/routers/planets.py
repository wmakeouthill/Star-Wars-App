from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException

from app.application.services.planet_service import PlanetService
from app.application.services.gamification_service import GamificationService
from app.domain.exceptions.not_found import ResourceNotFoundError
from app.domain.schemas.common import PaginatedResponse
from app.domain.schemas.planet import PlanetFilter, PlanetResponse
from app.interfaces.api.v1.dependencies.auth import get_current_user_id
from app.interfaces.api.v1.dependencies.services import get_planet_service
from app.interfaces.api.v1.dependencies.services import get_gamification_service

router = APIRouter(prefix="/planets", tags=["Planets"])


@router.get("/", response_model=PaginatedResponse[PlanetResponse])
async def list_planets(
    name: Optional[str] = Query(None, description="Filtrar por nome"),
    climate: Optional[str] = Query(None, description="Filtrar por clima"),
    terrain: Optional[str] = Query(None, description="Filtrar por terreno"),
    min_population: Optional[int] = Query(None, ge=0),
    max_population: Optional[int] = Query(None),
    sort_by: Optional[str] = Query(None, pattern="^(name|population)$"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    service: PlanetService = Depends(get_planet_service),
    gamification: GamificationService = Depends(get_gamification_service),
    user_id: str = Depends(get_current_user_id),
):
    filters = PlanetFilter(
        name=name,
        climate=climate,
        terrain=terrain,
        min_population=min_population,
        max_population=max_population,
    )
    result = await service.list_planets(filters, sort_by, sort_order, page, page_size)
    gamification.record_query(user_id, 5)
    return result


@router.get("/{planet_id}", response_model=PlanetResponse)
async def get_planet(
    planet_id: str,
    service: PlanetService = Depends(get_planet_service),
    gamification: GamificationService = Depends(get_gamification_service),
    user_id: str = Depends(get_current_user_id),
):
    try:
        result = await service.get_planet(planet_id)
        gamification.record_query(user_id, 2)
        return result
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
