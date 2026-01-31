from __future__ import annotations

import asyncio
from typing import List, Optional, Tuple

from app.domain.exceptions.not_found import ResourceNotFoundError
from app.domain.schemas.common import PaginatedResponse, PageMeta
from app.domain.schemas.starship import StarshipFilter, StarshipResponse
from app.domain.schemas.resource import NamedResourceSummary, TitledResourceSummary
from app.domain.repositories.swapi_client import ISWAPIClient
from app.infrastructure.external.swapi.client import extract_id, normalize_number
from app.infrastructure.external.swapi.parsers import parse_swapi_number
from app.application.services.swapi_pagination import fetch_swapi_slice
from app.application.services.image_lookup_service import ImageLookupService


def _norm_name(value: str) -> str:
    return " ".join(str(value).strip().split()).casefold()


class StarshipService:
    def __init__(self, swapi_client: ISWAPIClient, images: ImageLookupService | None = None) -> None:
        self._swapi = swapi_client
        self._images = images

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
            image_index = await self._images.get_starships_index() if self._images else None
            raw_items, total = await fetch_swapi_slice(
                self._swapi.get_starships_page, page=page, page_size=page_size, search=filters.name
            )
            total_pages = max(1, (total + page_size - 1) // page_size)
            meta = PageMeta(page=page, page_size=page_size, total=total, total_pages=total_pages)
            response_items = [self._map_starship(item, image_index=image_index) for item in raw_items]
            return PaginatedResponse(items=response_items, meta=meta)

        image_index = await self._images.get_starships_index() if self._images else None
        starships = await self._swapi.get_all_starships()
        filtered = self._apply_filters(starships, filters)
        sorted_items = self._apply_sort(filtered, sort_by, sort_order)
        page_items, meta = self._apply_pagination(sorted_items, page, page_size)
        response_items = [self._map_starship(item, image_index=image_index) for item in page_items]
        return PaginatedResponse(items=response_items, meta=meta)

    async def get_starship(self, starship_id: str) -> StarshipResponse:
        try:
            starship = await self._swapi.get_starship(starship_id)
        except Exception as exc:  # noqa: BLE001
            raise ResourceNotFoundError("Nave", starship_id) from exc
        image_index = await self._images.get_starships_index() if self._images else None
        return self._map_starship(starship, image_index=image_index)

    async def get_starship_with_relations(self, starship_id: str) -> StarshipResponse:
        try:
            starship = await self._swapi.get_starship(starship_id)
        except Exception as exc:  # noqa: BLE001
            raise ResourceNotFoundError("Nave", starship_id) from exc

        film_urls = starship.get("films", []) or []
        pilot_urls = starship.get("pilots", []) or []

        films_task = self._swapi.get_resources_by_urls(film_urls) if film_urls else asyncio.sleep(0, result=[])
        pilots_task = self._swapi.get_resources_by_urls(pilot_urls) if pilot_urls else asyncio.sleep(0, result=[])

        films_raw, pilots_raw = await asyncio.gather(films_task, pilots_task)

        films: list[TitledResourceSummary] = []
        for item in films_raw:
            url = item.get("url", "")
            films.append(TitledResourceSummary(id=extract_id(url), title=item.get("title", "")))

        pilots: list[NamedResourceSummary] = []
        for item in pilots_raw:
            url = item.get("url", "")
            pilots.append(NamedResourceSummary(id=extract_id(url), name=item.get("name", "")))

        image_index = await self._images.get_starships_index() if self._images else None
        return self._map_starship(
            starship,
            image_index=image_index,
            pilots=pilots,
            films=films,
        )

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

    def _map_starship(
        self,
        starship: dict,
        image_index: dict[str, str] | None = None,
        *,
        pilots: Optional[list[NamedResourceSummary]] = None,
        films: Optional[list[TitledResourceSummary]] = None,
    ) -> StarshipResponse:
        crew_parsed = parse_swapi_number(starship.get("crew"))
        passengers_parsed = parse_swapi_number(starship.get("passengers"))
        hyperdrive_parsed = parse_swapi_number(starship.get("hyperdrive_rating"))
        mglt_parsed = parse_swapi_number(starship.get("MGLT"))
        cost_parsed = parse_swapi_number(starship.get("cost_in_credits"))
        length_parsed = parse_swapi_number(starship.get("length"))
        speed_parsed = parse_swapi_number(starship.get("max_atmosphering_speed"))
        cargo_parsed = parse_swapi_number(starship.get("cargo_capacity"))

        film_urls = starship.get("films", []) or []
        pilot_urls = starship.get("pilots", []) or []
        image_url = None
        if image_index is not None:
            image_url = image_index.get(_norm_name(starship.get("name", "")))
        return StarshipResponse(
            id=extract_id(starship.get("url", "")),
            name=starship.get("name", ""),
            image_url=image_url,
            model=starship.get("model", ""),
            manufacturer=starship.get("manufacturer", ""),
            starship_class=starship.get("starship_class", ""),
            hyperdrive_rating=hyperdrive_parsed.value,
            hyperdrive_rating_raw=None if hyperdrive_parsed.is_unknown else hyperdrive_parsed.raw,
            mglt=self._to_int(starship.get("MGLT")),
            mglt_raw=None if mglt_parsed.is_unknown else mglt_parsed.raw,
            cost_in_credits=self._to_int(starship.get("cost_in_credits")),
            cost_in_credits_raw=None if cost_parsed.is_unknown else cost_parsed.raw,
            length=length_parsed.value,
            length_raw=None if length_parsed.is_unknown else length_parsed.raw,
            max_atmosphering_speed=self._to_int(starship.get("max_atmosphering_speed")),
            max_atmosphering_speed_raw=None if speed_parsed.is_unknown else speed_parsed.raw,
            cargo_capacity=self._to_int(starship.get("cargo_capacity")),
            cargo_capacity_raw=None if cargo_parsed.is_unknown else cargo_parsed.raw,
            consumables=starship.get("consumables", "") or "",
            crew=self._to_int(starship.get("crew")),
            crew_raw=None if crew_parsed.is_unknown else crew_parsed.raw,
            crew_min=int(crew_parsed.min) if crew_parsed.min is not None else None,
            crew_max=int(crew_parsed.max) if crew_parsed.max is not None else None,
            passengers=self._to_int(starship.get("passengers")),
            passengers_raw=None if passengers_parsed.is_unknown else passengers_parsed.raw,
            passengers_min=int(passengers_parsed.min) if passengers_parsed.min is not None else None,
            passengers_max=int(passengers_parsed.max) if passengers_parsed.max is not None else None,
            pilots=pilots or [],
            films=films or [],
            films_count=len(film_urls),
            pilots_count=len(pilot_urls),
        )

    def _to_int(self, value: Optional[str]) -> Optional[int]:
        parsed = normalize_number(value)
        return int(parsed) if parsed is not None else None
