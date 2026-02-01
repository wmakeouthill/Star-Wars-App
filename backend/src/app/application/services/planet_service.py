from __future__ import annotations

import asyncio
from typing import List, Optional, Tuple

from app.domain.exceptions.not_found import ResourceNotFoundError
from app.domain.schemas.common import PaginatedResponse, PageMeta
from app.domain.schemas.planet import PlanetFilter, PlanetResponse
from app.domain.schemas.resource import NamedResourceSummary, TitledResourceSummary
from app.domain.repositories.swapi_client import ISWAPIClient
from app.infrastructure.external.swapi.client import extract_id, normalize_number
from app.infrastructure.external.swapi.parsers import parse_swapi_number
from app.application.services.swapi_pagination import fetch_swapi_slice
from app.application.services.image_lookup_service import ImageLookupService
from app.application.services.fuzzy_filter import (
    apply_fuzzy_name_filter,
    apply_film_filter,
    apply_multi_value_filter,
)


def _norm_name(value: str) -> str:
    return " ".join(str(value).strip().split()).casefold()


class PlanetService:
    def __init__(self, swapi_client: ISWAPIClient, images: ImageLookupService | None = None) -> None:
        self._swapi = swapi_client
        self._images = images

    async def list_planets(
        self,
        filters: PlanetFilter,
        sort_by: Optional[str],
        sort_order: str,
        page: int,
        page_size: int,
    ) -> PaginatedResponse[PlanetResponse]:
        can_use_swapi_paging = (
            sort_by is None
            and not filters.climate
            and not filters.terrain
            and not filters.film_id
            and filters.min_population is None
            and filters.max_population is None
        )

        if can_use_swapi_paging:
            image_index = await self._images.get_locations_index() if self._images else None
            raw_items, total = await fetch_swapi_slice(
                self._swapi.get_planets_page, page=page, page_size=page_size, search=filters.name
            )
            total_pages = max(1, (total + page_size - 1) // page_size)
            meta = PageMeta(page=page, page_size=page_size, total=total, total_pages=total_pages)
            response_items = [self._map_planet(item, image_index=image_index) for item in raw_items]
            return PaginatedResponse(items=response_items, meta=meta)

        image_index = await self._images.get_locations_index() if self._images else None
        planets = await self._swapi.get_all_planets()
        filtered = self._apply_filters(planets, filters)
        sorted_items = self._apply_sort(filtered, sort_by, sort_order)
        page_items, meta = self._apply_pagination(sorted_items, page, page_size)
        response_items = [self._map_planet(item, image_index=image_index) for item in page_items]
        return PaginatedResponse(items=response_items, meta=meta)

    async def get_planet(self, planet_id: str) -> PlanetResponse:
        try:
            planet = await self._swapi.get_planet(planet_id)
        except Exception as exc:  # noqa: BLE001
            raise ResourceNotFoundError("Planeta", planet_id) from exc
        image_index = await self._images.get_locations_index() if self._images else None
        return self._map_planet(planet, image_index=image_index)

    async def get_planet_with_relations(self, planet_id: str) -> PlanetResponse:
        try:
            planet = await self._swapi.get_planet(planet_id)
        except Exception as exc:  # noqa: BLE001
            raise ResourceNotFoundError("Planeta", planet_id) from exc

        residents_urls = planet.get("residents", []) or []
        films_urls = planet.get("films", []) or []

        residents_task = (
            self._swapi.get_resources_by_urls(residents_urls) if residents_urls else asyncio.sleep(0, result=[])
        )
        films_task = self._swapi.get_resources_by_urls(films_urls) if films_urls else asyncio.sleep(0, result=[])

        residents_raw, films_raw = await asyncio.gather(residents_task, films_task)

        residents: list[NamedResourceSummary] = []
        for item in residents_raw:
            url = item.get("url", "")
            residents.append(NamedResourceSummary(id=extract_id(url), name=item.get("name", "")))

        films_detail: list[TitledResourceSummary] = []
        for item in films_raw:
            url = item.get("url", "")
            films_detail.append(TitledResourceSummary(id=extract_id(url), title=item.get("title", "")))

        image_index = await self._images.get_locations_index() if self._images else None
        return self._map_planet(
            planet,
            image_index=image_index,
            residents=residents,
            films_detail=films_detail,
        )

    def _apply_filters(self, planets: List[dict], filters: PlanetFilter) -> List[dict]:
        """
        Aplica filtros na lista de planetas.
        
        Usa fuzzy matching para nome.
        Climate/terrain usam multi-value filter (valores separados por vírgula).
        """
        result = planets
        
        # Filtro de nome com fuzzy matching
        if filters.name:
            result = apply_fuzzy_name_filter(result, filters.name, field_name="name")
        
        # Filtro de clima (multi-value: "arid, hot")
        if filters.climate:
            result = apply_multi_value_filter(result, filters.climate, field_name="climate")
        
        # Filtro de terreno (multi-value)
        if filters.terrain:
            result = apply_multi_value_filter(result, filters.terrain, field_name="terrain")
        
        # Filtro de filme
        if filters.film_id:
            result = apply_film_filter(result, filters.film_id, films_field="films")
        
        # Filtros de população (range)
        if filters.min_population is not None or filters.max_population is not None:
            filtered_by_pop = []
            for planet in result:
                population_value = normalize_number(planet.get("population"))
                if filters.min_population is not None and (
                    population_value is None or population_value < filters.min_population
                ):
                    continue
                if filters.max_population is not None and (
                    population_value is None or population_value > filters.max_population
                ):
                    continue
                filtered_by_pop.append(planet)
            result = filtered_by_pop
        
        return result

    def _apply_sort(self, planets: List[dict], sort_by: Optional[str], sort_order: str) -> List[dict]:
        if not sort_by:
            return planets

        def sort_key(planet: dict) -> Tuple[int, str]:
            if sort_by == "name":
                return (0, planet.get("name", ""))
            if sort_by == "population":
                value = normalize_number(planet.get("population"))
                return (1, value if value is not None else float("inf"))
            return (0, "")

        reverse = sort_order.lower() == "desc"
        return sorted(planets, key=sort_key, reverse=reverse)

    def _apply_pagination(self, items: List[dict], page: int, page_size: int) -> Tuple[List[dict], PageMeta]:
        total = len(items)
        total_pages = max(1, (total + page_size - 1) // page_size)
        start = (page - 1) * page_size
        end = start + page_size
        meta = PageMeta(page=page, page_size=page_size, total=total, total_pages=total_pages)
        return items[start:end], meta

    def _map_planet(
        self,
        planet: dict,
        image_index: dict[str, str] | None = None,
        *,
        residents: Optional[list[NamedResourceSummary]] = None,
        films_detail: Optional[list[TitledResourceSummary]] = None,
    ) -> PlanetResponse:
        population_parsed = parse_swapi_number(planet.get("population"))
        surface_water_parsed = parse_swapi_number(planet.get("surface_water"))
        diameter_parsed = parse_swapi_number(planet.get("diameter"))
        rotation_parsed = parse_swapi_number(planet.get("rotation_period"))
        orbital_parsed = parse_swapi_number(planet.get("orbital_period"))
        resident_urls = planet.get("residents", []) or []
        image_url = None
        if image_index is not None:
            image_url = image_index.get(_norm_name(planet.get("name", "")))
        return PlanetResponse(
            id=extract_id(planet.get("url", "")),
            name=planet.get("name", ""),
            image_url=image_url,
            climate=planet.get("climate", ""),
            gravity=planet.get("gravity", "") or "",
            terrain=planet.get("terrain", ""),
            surface_water=self._to_int(planet.get("surface_water")),
            surface_water_raw=None if surface_water_parsed.is_unknown else surface_water_parsed.raw,
            diameter=self._to_int(planet.get("diameter")),
            diameter_raw=None if diameter_parsed.is_unknown else diameter_parsed.raw,
            rotation_period=self._to_int(planet.get("rotation_period")),
            rotation_period_raw=None if rotation_parsed.is_unknown else rotation_parsed.raw,
            orbital_period=self._to_int(planet.get("orbital_period")),
            orbital_period_raw=None if orbital_parsed.is_unknown else orbital_parsed.raw,
            population=self._to_int(planet.get("population")),
            population_raw=None if population_parsed.is_unknown else population_parsed.raw,
            residents_count=len(resident_urls),
            residents=residents or [],
            films=[extract_id(url) for url in planet.get("films", [])],
            films_detail=films_detail or [],
        )

    def _to_int(self, value: Optional[str]) -> Optional[int]:
        parsed = normalize_number(value)
        return int(parsed) if parsed is not None else None
