from __future__ import annotations

from typing import List, Optional, Tuple

from app.application.services.image_lookup_service import ImageLookupService
from app.application.services.swapi_pagination import fetch_swapi_slice
from app.domain.exceptions.not_found import ResourceNotFoundError
from app.domain.repositories.swapi_client import ISWAPIClient
from app.domain.schemas.common import PaginatedResponse, PageMeta
from app.domain.schemas.vehicle import VehicleFilter, VehicleResponse
from app.infrastructure.external.swapi.client import extract_id, normalize_number
from app.infrastructure.external.swapi.parsers import parse_swapi_number
from app.application.services.fuzzy_filter import (
    apply_fuzzy_name_filter,
    apply_film_filter,
    apply_multi_value_filter,
    apply_enum_filter,
)
from app.application.services.fuzzy_filter import (
    apply_fuzzy_name_filter,
    apply_film_filter,
    apply_multi_value_filter,
    apply_enum_filter,
)


def _norm_name(value: str) -> str:
    return " ".join(str(value).strip().split()).casefold()


class VehicleService:
    def __init__(self, swapi_client: ISWAPIClient, images: ImageLookupService | None = None) -> None:
        self._swapi = swapi_client
        self._images = images

    async def list_vehicles(
        self,
        filters: VehicleFilter,
        sort_by: Optional[str],
        sort_order: str,
        page: int,
        page_size: int,
    ) -> PaginatedResponse[VehicleResponse]:
        can_use_swapi_paging = (
            sort_by is None and not filters.manufacturer and not filters.vehicle_class and not filters.film_id
        )

        image_index = await self._images.get_vehicles_index() if self._images else None

        if can_use_swapi_paging:
            raw_items, total = await fetch_swapi_slice(
                self._swapi.get_vehicles_page, page=page, page_size=page_size, search=filters.name
            )
            total_pages = max(1, (total + page_size - 1) // page_size)
            meta = PageMeta(page=page, page_size=page_size, total=total, total_pages=total_pages)
            response_items = [self._map_vehicle(item, image_index=image_index) for item in raw_items]
            return PaginatedResponse(items=response_items, meta=meta)

        vehicles = await self._swapi.get_all_vehicles()
        filtered = self._apply_filters(vehicles, filters)
        sorted_items = self._apply_sort(filtered, sort_by, sort_order)
        page_items, meta = self._apply_pagination(sorted_items, page, page_size)
        response_items = [self._map_vehicle(item, image_index=image_index) for item in page_items]
        return PaginatedResponse(items=response_items, meta=meta)

    async def get_vehicle(self, vehicle_id: str) -> VehicleResponse:
        try:
            vehicle = await self._swapi.get_vehicle(vehicle_id)
        except Exception as exc:  # noqa: BLE001
            raise ResourceNotFoundError("Veículo", vehicle_id) from exc

        image_index = await self._images.get_vehicles_index() if self._images else None
        return self._map_vehicle(vehicle, image_index=image_index)

    def _apply_filters(self, vehicles: List[dict], filters: VehicleFilter) -> List[dict]:
        """Aplica filtros com fuzzy matching para nome."""
        result = vehicles
        
        if filters.name:
            result = apply_fuzzy_name_filter(result, filters.name, field_name="name")
        
        if filters.manufacturer:
            result = apply_multi_value_filter(result, filters.manufacturer, field_name="manufacturer")
        
        if filters.vehicle_class:
            result = apply_enum_filter(result, filters.vehicle_class, field_name="vehicle_class")
        
        if filters.film_id:
            result = apply_film_filter(result, filters.film_id, films_field="films")
        
        return result

    def _apply_sort(self, vehicles: List[dict], sort_by: Optional[str], sort_order: str) -> List[dict]:
        if not sort_by:
            return vehicles

        def sort_key(vehicle: dict) -> Tuple[int, str]:
            if sort_by == "name":
                return (0, vehicle.get("name", ""))
            if sort_by == "crew":
                value = normalize_number(vehicle.get("crew"))
                return (1, value if value is not None else float("inf"))
            return (0, "")

        reverse = sort_order.lower() == "desc"
        return sorted(vehicles, key=sort_key, reverse=reverse)

    def _apply_pagination(self, items: List[dict], page: int, page_size: int) -> Tuple[List[dict], PageMeta]:
        total = len(items)
        total_pages = max(1, (total + page_size - 1) // page_size)
        start = (page - 1) * page_size
        end = start + page_size
        meta = PageMeta(page=page, page_size=page_size, total=total, total_pages=total_pages)
        return items[start:end], meta

    def _map_vehicle(self, vehicle: dict, image_index: dict[str, str] | None = None) -> VehicleResponse:
        crew_parsed = parse_swapi_number(vehicle.get("crew"))
        passengers_parsed = parse_swapi_number(vehicle.get("passengers"))

        image_url = None
        if image_index is not None:
            image_url = image_index.get(_norm_name(vehicle.get("name", "")))

        return VehicleResponse(
            id=extract_id(vehicle.get("url", "")),
            name=vehicle.get("name", ""),
            image_url=image_url,
            model=vehicle.get("model", ""),
            manufacturer=vehicle.get("manufacturer", ""),
            vehicle_class=vehicle.get("vehicle_class", ""),
            crew=self._to_int(vehicle.get("crew")),
            crew_raw=None if crew_parsed.is_unknown else crew_parsed.raw,
            crew_min=int(crew_parsed.min) if crew_parsed.min is not None else None,
            crew_max=int(crew_parsed.max) if crew_parsed.max is not None else None,
            passengers=self._to_int(vehicle.get("passengers")),
            passengers_raw=None if passengers_parsed.is_unknown else passengers_parsed.raw,
            passengers_min=int(passengers_parsed.min) if passengers_parsed.min is not None else None,
            passengers_max=int(passengers_parsed.max) if passengers_parsed.max is not None else None,
        )

    def _to_int(self, value: Optional[str]) -> Optional[int]:
        parsed = normalize_number(value)
        return int(parsed) if parsed is not None else None

