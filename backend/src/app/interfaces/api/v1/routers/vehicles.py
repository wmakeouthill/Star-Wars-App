from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.application.services.gamification_service import GamificationService
from app.application.services.vehicle_service import VehicleService
from app.domain.exceptions.not_found import ResourceNotFoundError
from app.domain.schemas.common import PaginatedResponse
from app.domain.schemas.vehicle import VehicleFilter, VehicleResponse
from app.interfaces.api.v1.dependencies.auth import get_current_user_id
from app.interfaces.api.v1.dependencies.services import get_gamification_service, get_vehicle_service

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])


@router.get("/", response_model=PaginatedResponse[VehicleResponse])
async def list_vehicles(
    name: Optional[str] = Query(None, description="Filtrar por nome"),
    manufacturer: Optional[str] = Query(None, description="Filtrar por fabricante"),
    vehicle_class: Optional[str] = Query(None, description="Filtrar por classe"),
    sort_by: Optional[str] = Query(None, pattern="^(name|crew)$"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    service: VehicleService = Depends(get_vehicle_service),
    gamification: GamificationService = Depends(get_gamification_service),
    user_id: str = Depends(get_current_user_id),
):
    filters = VehicleFilter(name=name, manufacturer=manufacturer, vehicle_class=vehicle_class)
    result = await service.list_vehicles(filters, sort_by, sort_order, page, page_size)
    gamification.record_query(user_id, 5)
    return result


@router.get("/{vehicle_id}", response_model=VehicleResponse)
async def get_vehicle(
    vehicle_id: str,
    service: VehicleService = Depends(get_vehicle_service),
    gamification: GamificationService = Depends(get_gamification_service),
    user_id: str = Depends(get_current_user_id),
):
    try:
        result = await service.get_vehicle(vehicle_id)
        gamification.record_query(user_id, 2)
        return result
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

