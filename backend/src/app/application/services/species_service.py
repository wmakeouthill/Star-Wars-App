from __future__ import annotations

from typing import List, Optional, Tuple

from app.application.services.image_lookup_service import ImageLookupService
from app.application.services.swapi_pagination import fetch_swapi_slice
from app.domain.exceptions.not_found import ResourceNotFoundError
from app.domain.repositories.swapi_client import ISWAPIClient
from app.domain.schemas.common import PaginatedResponse, PageMeta
from app.domain.schemas.species import SpeciesFilter, SpeciesResponse
from app.infrastructure.external.swapi.client import extract_id, normalize_number
from app.infrastructure.external.swapi.parsers import parse_swapi_number
from app.application.services.fuzzy_filter import (
    apply_fuzzy_name_filter,
    apply_film_filter,
    apply_enum_filter,
)
from app.application.services.fuzzy_filter import (
    apply_fuzzy_name_filter,
    apply_film_filter,
    apply_enum_filter,
)


def _norm_name(value: str) -> str:
    return " ".join(str(value).strip().split()).casefold()


class SpeciesService:
    def __init__(self, swapi_client: ISWAPIClient, images: ImageLookupService | None = None) -> None:
        self._swapi = swapi_client
        self._images = images

    async def list_species(
        self,
        filters: SpeciesFilter,
        sort_by: Optional[str],
        sort_order: str,
        page: int,
        page_size: int,
    ) -> PaginatedResponse[SpeciesResponse]:
        can_use_swapi_paging = sort_by is None and not filters.classification and not filters.language and not filters.film_id

        image_index = await self._images.get_species_index() if self._images else None

        if can_use_swapi_paging:
            raw_items, total = await fetch_swapi_slice(
                self._swapi.get_species_page, page=page, page_size=page_size, search=filters.name
            )
            total_pages = max(1, (total + page_size - 1) // page_size)
            meta = PageMeta(page=page, page_size=page_size, total=total, total_pages=total_pages)
            response_items = [self._map_species(item, image_index=image_index) for item in raw_items]
            return PaginatedResponse(items=response_items, meta=meta)

        species = await self._swapi.get_all_species()
        filtered = self._apply_filters(species, filters)
        sorted_items = self._apply_sort(filtered, sort_by, sort_order)
        page_items, meta = self._apply_pagination(sorted_items, page, page_size)
        response_items = [self._map_species(item, image_index=image_index) for item in page_items]
        return PaginatedResponse(items=response_items, meta=meta)

    async def get_species(self, species_id: str) -> SpeciesResponse:
        try:
            specie = await self._swapi.get_species(species_id)
        except Exception as exc:  # noqa: BLE001
            raise ResourceNotFoundError("Espécie", species_id) from exc

        image_index = await self._images.get_species_index() if self._images else None
        return self._map_species(specie, image_index=image_index)

    def _apply_filters(self, species: List[dict], filters: SpeciesFilter) -> List[dict]:
        """Aplica filtros com fuzzy matching para nome."""
        result = species
        
        if filters.name:
            result = apply_fuzzy_name_filter(result, filters.name, field_name="name")
        
        if filters.classification:
            result = apply_enum_filter(result, filters.classification, field_name="classification")
        
        if filters.language:
            result = apply_enum_filter(result, filters.language, field_name="language")
        
        if filters.film_id:
            result = apply_film_filter(result, filters.film_id, films_field="films")
        
        return result

    def _apply_sort(self, species: List[dict], sort_by: Optional[str], sort_order: str) -> List[dict]:
        if not sort_by:
            return species

        def sort_key(specie: dict) -> Tuple[int, str]:
            if sort_by == "name":
                return (0, specie.get("name", ""))
            if sort_by == "average_height":
                value = normalize_number(specie.get("average_height"))
                return (1, value if value is not None else float("inf"))
            return (0, "")

        reverse = sort_order.lower() == "desc"
        return sorted(species, key=sort_key, reverse=reverse)

    def _apply_pagination(self, items: List[dict], page: int, page_size: int) -> Tuple[List[dict], PageMeta]:
        total = len(items)
        total_pages = max(1, (total + page_size - 1) // page_size)
        start = (page - 1) * page_size
        end = start + page_size
        meta = PageMeta(page=page, page_size=page_size, total=total, total_pages=total_pages)
        return items[start:end], meta

    def _map_species(self, specie: dict, image_index: dict[str, str] | None = None) -> SpeciesResponse:
        height_parsed = parse_swapi_number(specie.get("average_height"))
        lifespan_parsed = parse_swapi_number(specie.get("average_lifespan"))

        image_url = None
        if image_index is not None:
            image_url = image_index.get(_norm_name(specie.get("name", "")))

        return SpeciesResponse(
            id=extract_id(specie.get("url", "")),
            name=specie.get("name", ""),
            image_url=image_url,
            classification=specie.get("classification", ""),
            designation=specie.get("designation", ""),
            average_height=self._to_int(specie.get("average_height")),
            average_height_raw=None if height_parsed.is_unknown else height_parsed.raw,
            average_lifespan=self._to_int(specie.get("average_lifespan")),
            average_lifespan_raw=None if lifespan_parsed.is_unknown else lifespan_parsed.raw,
            language=specie.get("language", ""),
        )

    def _to_int(self, value: Optional[str]) -> Optional[int]:
        parsed = normalize_number(value)
        return int(parsed) if parsed is not None else None

