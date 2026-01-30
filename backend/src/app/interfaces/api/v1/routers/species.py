from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.application.services.gamification_service import GamificationService
from app.application.services.species_service import SpeciesService
from app.domain.exceptions.not_found import ResourceNotFoundError
from app.domain.schemas.common import PaginatedResponse
from app.domain.schemas.species import SpeciesFilter, SpeciesResponse
from app.interfaces.api.v1.dependencies.auth import get_current_user_id
from app.interfaces.api.v1.dependencies.services import get_gamification_service, get_species_service

router = APIRouter(prefix="/species", tags=["Species"])


@router.get("/", response_model=PaginatedResponse[SpeciesResponse])
async def list_species(
    name: Optional[str] = Query(None, description="Filtrar por nome"),
    classification: Optional[str] = Query(None, description="Filtrar por classificação"),
    language: Optional[str] = Query(None, description="Filtrar por idioma"),
    sort_by: Optional[str] = Query(None, pattern="^(name|average_height)$"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    service: SpeciesService = Depends(get_species_service),
    gamification: GamificationService = Depends(get_gamification_service),
    user_id: str = Depends(get_current_user_id),
):
    filters = SpeciesFilter(name=name, classification=classification, language=language)
    result = await service.list_species(filters, sort_by, sort_order, page, page_size)
    gamification.record_query(user_id, 5)
    return result


@router.get("/{species_id}", response_model=SpeciesResponse)
async def get_species(
    species_id: str,
    service: SpeciesService = Depends(get_species_service),
    gamification: GamificationService = Depends(get_gamification_service),
    user_id: str = Depends(get_current_user_id),
):
    try:
        result = await service.get_species(species_id)
        gamification.record_query(user_id, 2)
        return result
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

