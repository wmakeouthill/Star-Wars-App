from __future__ import annotations

import asyncio
from typing import List, Optional, Tuple

from app.domain.exceptions.not_found import ResourceNotFoundError
from app.domain.schemas.character import CharacterFilter, CharacterResponse, FilmSummary, PlanetSummary
from app.domain.schemas.resource import NamedResourceSummary
from app.domain.schemas.common import PaginatedResponse, PageMeta
from app.domain.repositories.swapi_client import ISWAPIClient
from app.infrastructure.external.swapi.client import extract_id, normalize_number
from app.infrastructure.external.swapi.parsers import parse_swapi_number
from app.application.services.swapi_pagination import fetch_swapi_slice
from app.application.services.image_lookup_service import ImageLookupService


def _norm_name(value: str) -> str:
    return " ".join(str(value).strip().split()).casefold()


class CharacterService:
    def __init__(self, swapi_client: ISWAPIClient, images: ImageLookupService | None = None) -> None:
        self._swapi = swapi_client
        self._images = images

    async def list_characters(
        self,
        filters: CharacterFilter,
        sort_by: Optional[str],
        sort_order: str,
        page: int,
        page_size: int,
    ) -> PaginatedResponse[CharacterResponse]:
        # Otimização: quando não há filtros/ordenação avançados, buscamos do SWAPI apenas
        # o recorte necessário (page/page_size) em vez de baixar tudo e paginar depois.
        can_use_swapi_paging = (
            sort_by is None
            and not filters.gender
            and not filters.homeworld
            and not filters.film_id
            and filters.min_height is None
            and filters.max_height is None
        )

        if can_use_swapi_paging:
            image_index = await self._images.get_characters_index() if self._images else None
            raw_items, total = await fetch_swapi_slice(
                self._swapi.get_people_page, page=page, page_size=page_size, search=filters.name
            )
            total_pages = max(1, (total + page_size - 1) // page_size)
            meta = PageMeta(page=page, page_size=page_size, total=total, total_pages=total_pages)
            response_items = [self._map_character(item, image_index=image_index) for item in raw_items]
            return PaginatedResponse(items=response_items, meta=meta)

        image_index = await self._images.get_characters_index() if self._images else None
        people = await self._swapi.get_all_people()
        filtered = self._apply_filters(people, filters)
        sorted_items = self._apply_sort(filtered, sort_by, sort_order)
        page_items, meta = self._apply_pagination(sorted_items, page, page_size)
        response_items = [self._map_character(item, image_index=image_index) for item in page_items]
        return PaginatedResponse(items=response_items, meta=meta)

    async def get_character(self, character_id: str, include_relations: bool) -> CharacterResponse:
        try:
            person = await self._swapi.get_person(character_id)
        except Exception as exc:  # noqa: BLE001
            raise ResourceNotFoundError("Personagem", character_id) from exc

        if include_relations:
            image_index = await self._images.get_characters_index() if self._images else None

            homeworld_task = self._fetch_homeworld(person)
            films_task = self._fetch_films(person)
            species_task = self._fetch_named_resources(person, "species")
            vehicles_task = self._fetch_named_resources(person, "vehicles")
            starships_task = self._fetch_named_resources(person, "starships")

            homeworld, films, species, vehicles, starships = await asyncio.gather(
                homeworld_task, films_task, species_task, vehicles_task, starships_task
            )

            return self._map_character(
                person,
                homeworld=homeworld,
                films=films,
                species=species,
                vehicles=vehicles,
                starships=starships,
                image_index=image_index,
            )

        image_index = await self._images.get_characters_index() if self._images else None
        return self._map_character(person, image_index=image_index)

    async def list_characters_by_film(
        self, film_id: str, page: int, page_size: int
    ) -> PaginatedResponse[CharacterResponse]:
        try:
            film = await self._swapi.get_film(film_id)
        except Exception as exc:  # noqa: BLE001
            raise ResourceNotFoundError("Filme", film_id) from exc

        character_urls = film.get("characters", [])
        if not character_urls:
            meta = PageMeta(page=page, page_size=page_size, total=0, total_pages=1)
            return PaginatedResponse(items=[], meta=meta)

        # Otimização: não baixar todos os personagens do filme; buscar só os URLs da página.
        total = len(character_urls)
        total_pages = max(1, (total + page_size - 1) // page_size)
        start = (page - 1) * page_size
        end = start + page_size
        page_urls = character_urls[start:end]
        if not page_urls:
            meta = PageMeta(page=page, page_size=page_size, total=total, total_pages=total_pages)
            return PaginatedResponse(items=[], meta=meta)

        characters = await self._swapi.get_resources_by_urls(page_urls)
        # Proteção extra (principalmente para mocks em testes): não deixar vir mais do que o pedido.
        characters = characters[: len(page_urls)]
        image_index = await self._images.get_characters_index() if self._images else None
        response_items = [self._map_character(item, image_index=image_index) for item in characters]
        meta = PageMeta(page=page, page_size=page_size, total=total, total_pages=total_pages)
        return PaginatedResponse(items=response_items, meta=meta)

    def _apply_filters(self, people: List[dict], filters: CharacterFilter) -> List[dict]:
        def matches(person: dict) -> bool:
            if filters.name and filters.name.lower() not in person.get("name", "").lower():
                return False
            if filters.gender and filters.gender.lower() != person.get("gender", "").lower():
                return False
            if filters.homeworld and extract_id(person.get("homeworld", "")) != filters.homeworld:
                return False
            if filters.film_id and filters.film_id not in [extract_id(url) for url in person.get("films", [])]:
                return False
            height_value = normalize_number(person.get("height"))
            if filters.min_height is not None and (height_value is None or height_value < filters.min_height):
                return False
            if filters.max_height is not None and (height_value is None or height_value > filters.max_height):
                return False
            return True

        return [person for person in people if matches(person)]

    def _apply_sort(self, people: List[dict], sort_by: Optional[str], sort_order: str) -> List[dict]:
        if not sort_by:
            return people

        def sort_key(person: dict) -> Tuple[int, str]:
            if sort_by == "name":
                return (0, person.get("name", ""))
            if sort_by == "height":
                value = normalize_number(person.get("height"))
                return (1, value if value is not None else float("inf"))
            if sort_by == "mass":
                value = normalize_number(person.get("mass"))
                return (1, value if value is not None else float("inf"))
            return (0, "")

        reverse = sort_order.lower() == "desc"
        return sorted(people, key=sort_key, reverse=reverse)

    def _apply_pagination(self, items: List[dict], page: int, page_size: int) -> Tuple[List[dict], PageMeta]:
        total = len(items)
        total_pages = max(1, (total + page_size - 1) // page_size)
        start = (page - 1) * page_size
        end = start + page_size
        meta = PageMeta(page=page, page_size=page_size, total=total, total_pages=total_pages)
        return items[start:end], meta

    async def _fetch_homeworld(self, person: dict) -> Optional[PlanetSummary]:
        url = person.get("homeworld")
        if not url:
            return None
        data = await self._swapi.get_resource_by_url(url)
        return PlanetSummary(id=extract_id(url), name=data.get("name", ""))

    async def _fetch_films(self, person: dict) -> List[FilmSummary]:
        urls = person.get("films", [])
        if not urls:
            return []
        films = await self._swapi.get_resources_by_urls(urls)
        return [FilmSummary(id=extract_id(film.get("url", "")), title=film.get("title", "")) for film in films]

    async def _fetch_named_resources(self, person: dict, key: str) -> List[NamedResourceSummary]:
        urls = person.get(key, [])
        if not urls:
            return []
        resources = await self._swapi.get_resources_by_urls(urls)
        mapped: list[NamedResourceSummary] = []
        for item in resources:
            url = item.get("url", "")
            mapped.append(NamedResourceSummary(id=extract_id(url), name=item.get("name", "")))
        return mapped

    def _map_character(
        self,
        person: dict,
        homeworld: Optional[PlanetSummary] = None,
        films: Optional[List[FilmSummary]] = None,
        species: Optional[List[NamedResourceSummary]] = None,
        vehicles: Optional[List[NamedResourceSummary]] = None,
        starships: Optional[List[NamedResourceSummary]] = None,
        image_index: dict[str, str] | None = None,
    ) -> CharacterResponse:
        height_parsed = parse_swapi_number(person.get("height"))
        mass_parsed = parse_swapi_number(person.get("mass"))
        image_url = None
        if image_index is not None:
            image_url = image_index.get(_norm_name(person.get("name", "")))
        return CharacterResponse(
            id=extract_id(person.get("url", "")),
            name=person.get("name", ""),
            image_url=image_url,
            height=self._to_int(person.get("height")),
            height_raw=None if height_parsed.is_unknown else height_parsed.raw,
            height_min=int(height_parsed.min) if height_parsed.min is not None else None,
            height_max=int(height_parsed.max) if height_parsed.max is not None else None,
            mass=normalize_number(person.get("mass")),
            mass_raw=None if mass_parsed.is_unknown else mass_parsed.raw,
            mass_min=mass_parsed.min,
            mass_max=mass_parsed.max,
            hair_color=person.get("hair_color", ""),
            skin_color=person.get("skin_color", ""),
            eye_color=person.get("eye_color", ""),
            birth_year=person.get("birth_year", ""),
            gender=person.get("gender", ""),
            homeworld=homeworld,
            films=films or [],
            species=species or [],
            vehicles=vehicles or [],
            starships=starships or [],
        )

    def _to_int(self, value: Optional[str]) -> Optional[int]:
        parsed = normalize_number(value)
        return int(parsed) if parsed is not None else None
