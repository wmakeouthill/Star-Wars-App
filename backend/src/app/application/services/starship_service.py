from __future__ import annotations

from typing import List, Optional, Tuple

from app.domain.exceptions.not_found import ResourceNotFoundError
from app.domain.schemas.common import PaginatedResponse, PageMeta
from app.domain.schemas.starship import StarshipFilter, StarshipResponse
from app.domain.repositories.swapi_client import ISWAPIClient
from app.infrastructure.external.swapi.client import extract_id, normalize_number
from app.application.services.swapi_pagination import fetch_swapi_slice


class StarshipService:
    def __init__(self, swapi_client: ISWAPIClient) -> None:
        self._swapi = swapi_client

    async def list_starships(
        self,
        filters: StarshipFilter,
        sort_by: Optional[str],
        sort_order: str,
        page: int,
        page_size: int,
    ) -> PaginatedResponse[StarshipResponse]:
        can_use_swapi_paging = (
            sort_by is None and not filters.manufacturer and not filters.starship_class
        )

        if can_use_swapi_paging:
            raw_items, total = await fetch_swapi_slice(
                self._swapi.get_starships_page, page=page, page_size=page_size, search=filters.name
            )
            total_pages = max(1, (total + page_size - 1) // page_size)
            meta = PageMeta(page=page, page_size=page_size, total=total, total_pages=total_pages)
            response_items = [self._map_starship(item) for item in raw_items]
            return PaginatedResponse(items=response_items, meta=meta)

        starships = await self._swapi.get_all_starships()
        filtered = self._apply_filters(starships, filters)
        sorted_items = self._apply_sort(filtered, sort_by, sort_order)
        page_items, meta = self._apply_pagination(sorted_items, page, page_size)
        response_items = [self._map_starship(item) for item in page_items]
        return PaginatedResponse(items=response_items, meta=meta)

    async def get_starship(self, starship_id: str) -> StarshipResponse:
        try:
            starship = await self._swapi.get_starship(starship_id)
        except Exception as exc:  # noqa: BLE001
            raise ResourceNotFoundError("Nave", starship_id) from exc
        return self._map_starship(starship)

    def _apply_filters(self, starships: List[dict], filters: StarshipFilter) -> List[dict]:
        def matches(starship: dict) -> bool:
            if filters.name and filters.name.lower() not in starship.get("name", "").lower():
                return False
            if filters.manufacturer and filters.manufacturer.lower() not in starship.get("manufacturer", "").lower():
                return False
            if filters.starship_class and filters.starship_class.lower() not in starship.get("starship_class", "").lower():
                return False
            return True

        return [ship for ship in starships if matches(ship)]

    def _apply_sort(self, starships: List[dict], sort_by: Optional[str], sort_order: str) -> List[dict]:
        if not sort_by:
            return starships

        def sort_key(starship: dict) -> Tuple[int, str]:
            if sort_by == "name":
                return (0, starship.get("name", ""))
            if sort_by == "crew":
                value = normalize_number(starship.get("crew"))
                return (1, value if value is not None else float("inf"))
            return (0, "")

        reverse = sort_order.lower() == "desc"
        return sorted(starships, key=sort_key, reverse=reverse)

    def _apply_pagination(self, items: List[dict], page: int, page_size: int) -> Tuple[List[dict], PageMeta]:
        total = len(items)
        total_pages = max(1, (total + page_size - 1) // page_size)
        start = (page - 1) * page_size
        end = start + page_size
        meta = PageMeta(page=page, page_size=page_size, total=total, total_pages=total_pages)
        return items[start:end], meta

    def _map_starship(self, starship: dict) -> StarshipResponse:
        return StarshipResponse(
            id=extract_id(starship.get("url", "")),
            name=starship.get("name", ""),
            model=starship.get("model", ""),
            manufacturer=starship.get("manufacturer", ""),
            starship_class=starship.get("starship_class", ""),
            crew=self._to_int(starship.get("crew")),
            passengers=self._to_int(starship.get("passengers")),
        )

    def _to_int(self, value: Optional[str]) -> Optional[int]:
        parsed = normalize_number(value)
        return int(parsed) if parsed is not None else None
