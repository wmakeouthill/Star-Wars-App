from __future__ import annotations

import asyncio
from typing import List, Optional, Tuple

from app.application.services.image_lookup_service import ImageLookupService
from app.domain.exceptions.not_found import ResourceNotFoundError
from app.domain.schemas.common import PaginatedResponse, PageMeta
from app.domain.schemas.film import FilmFilter, FilmResponse
from app.domain.schemas.resource import NamedResourceSummary
from app.domain.repositories.swapi_client import ISWAPIClient
from app.infrastructure.external.swapi.client import extract_id
from app.application.services.swapi_pagination import fetch_swapi_slice


_FILM_POSTER_BY_EPISODE: dict[int, str] = {
    # Fontes: Wikimedia Commons/Wikipedia (thumbnails/posters públicos).
    1: "https://upload.wikimedia.org/wikipedia/en/4/40/Star_Wars_Phantom_Menace_poster.jpg",
    2: "https://upload.wikimedia.org/wikipedia/en/3/32/Star_Wars_-_Episode_II_Attack_of_the_Clones_%28movie_poster%29.jpg",
    3: "https://upload.wikimedia.org/wikipedia/en/9/93/Star_Wars_Episode_III_Revenge_of_the_Sith_poster.jpg",
    4: "https://upload.wikimedia.org/wikipedia/en/8/87/StarWarsMoviePoster1977.jpg",
    5: "https://upload.wikimedia.org/wikipedia/en/3/3c/SW_-_Empire_Strikes_Back.jpg",
    6: "https://upload.wikimedia.org/wikipedia/en/b/b2/ReturnOfTheJediPoster1983.jpg",
}


def _norm_name(value: str) -> str:
    return " ".join(str(value).strip().split()).casefold()


class FilmService:
    def __init__(self, swapi_client: ISWAPIClient, images: ImageLookupService | None = None) -> None:
        self._swapi = swapi_client
        self._images = images

    async def list_films(
        self,
        filters: FilmFilter,
        sort_by: Optional[str],
        sort_order: str,
        page: int,
        page_size: int,
    ) -> PaginatedResponse[FilmResponse]:
        can_use_swapi_paging = sort_by is None and not filters.director and not filters.producer
        image_index = await self._images.get_films_index() if self._images else None

        if can_use_swapi_paging:
            raw_items, total = await fetch_swapi_slice(
                self._swapi.get_films_page, page=page, page_size=page_size, search=filters.title
            )
            total_pages = max(1, (total + page_size - 1) // page_size)
            meta = PageMeta(page=page, page_size=page_size, total=total, total_pages=total_pages)
            response_items = [self._map_film(item, image_index=image_index) for item in raw_items]
            return PaginatedResponse(items=response_items, meta=meta)

        films = await self._swapi.get_all_films()
        filtered = self._apply_filters(films, filters)
        sorted_items = self._apply_sort(filtered, sort_by, sort_order)
        page_items, meta = self._apply_pagination(sorted_items, page, page_size)
        response_items = [self._map_film(item, image_index=image_index) for item in page_items]
        return PaginatedResponse(items=response_items, meta=meta)

    async def get_film(self, film_id: str) -> FilmResponse:
        try:
            film = await self._swapi.get_film(film_id)
        except Exception as exc:  # noqa: BLE001
            raise ResourceNotFoundError("Filme", film_id) from exc
        image_index = await self._images.get_films_index() if self._images else None
        return self._map_film(film, image_index=image_index)

    async def get_film_with_relations(self, film_id: str) -> FilmResponse:
        try:
            film = await self._swapi.get_film(film_id)
        except Exception as exc:  # noqa: BLE001
            raise ResourceNotFoundError("Filme", film_id) from exc

        planets_urls = film.get("planets", []) or []
        starships_urls = film.get("starships", []) or []
        vehicles_urls = film.get("vehicles", []) or []
        species_urls = film.get("species", []) or []

        planets_task = self._swapi.get_resources_by_urls(planets_urls) if planets_urls else asyncio.sleep(0, result=[])
        starships_task = (
            self._swapi.get_resources_by_urls(starships_urls) if starships_urls else asyncio.sleep(0, result=[])
        )
        vehicles_task = self._swapi.get_resources_by_urls(vehicles_urls) if vehicles_urls else asyncio.sleep(0, result=[])
        species_task = self._swapi.get_resources_by_urls(species_urls) if species_urls else asyncio.sleep(0, result=[])

        planets_raw, starships_raw, vehicles_raw, species_raw = await asyncio.gather(
            planets_task, starships_task, vehicles_task, species_task
        )

        def map_named(items: list[dict]) -> list[NamedResourceSummary]:
            mapped: list[NamedResourceSummary] = []
            for item in items:
                url = item.get("url", "")
                mapped.append(NamedResourceSummary(id=extract_id(url), name=item.get("name", "")))
            return mapped

        image_index = await self._images.get_films_index() if self._images else None
        return self._map_film(
            film,
            planets_rel=map_named(planets_raw),
            starships_rel=map_named(starships_raw),
            vehicles_rel=map_named(vehicles_raw),
            species_rel=map_named(species_raw),
            image_index=image_index,
        )

    def _apply_filters(self, films: List[dict], filters: FilmFilter) -> List[dict]:
        def matches(film: dict) -> bool:
            if filters.title and filters.title.lower() not in film.get("title", "").lower():
                return False
            if filters.director and filters.director.lower() not in film.get("director", "").lower():
                return False
            if filters.producer and filters.producer.lower() not in film.get("producer", "").lower():
                return False
            return True

        return [film for film in films if matches(film)]

    def _apply_sort(self, films: List[dict], sort_by: Optional[str], sort_order: str) -> List[dict]:
        if not sort_by:
            return films

        def sort_key(film: dict) -> Tuple[int, str]:
            if sort_by == "title":
                return (0, film.get("title", ""))
            if sort_by == "episode_id":
                return (1, film.get("episode_id", 0))
            return (0, "")

        reverse = sort_order.lower() == "desc"
        return sorted(films, key=sort_key, reverse=reverse)

    def _apply_pagination(self, items: List[dict], page: int, page_size: int) -> Tuple[List[dict], PageMeta]:
        total = len(items)
        total_pages = max(1, (total + page_size - 1) // page_size)
        start = (page - 1) * page_size
        end = start + page_size
        meta = PageMeta(page=page, page_size=page_size, total=total, total_pages=total_pages)
        return items[start:end], meta

    def _map_film(
        self,
        film: dict,
        *,
        planets_rel: Optional[list[NamedResourceSummary]] = None,
        starships_rel: Optional[list[NamedResourceSummary]] = None,
        vehicles_rel: Optional[list[NamedResourceSummary]] = None,
        species_rel: Optional[list[NamedResourceSummary]] = None,
        image_index: dict[str, str] | None = None,
    ) -> FilmResponse:
        characters_urls = film.get("characters", []) or []
        planets_urls = film.get("planets", []) or []
        starships_urls = film.get("starships", []) or []
        vehicles_urls = film.get("vehicles", []) or []
        species_urls = film.get("species", []) or []
        episode_id = int(film.get("episode_id", 0))
        title = film.get("title", "")
        image_url = None
        if image_index is not None and title:
            image_url = image_index.get(_norm_name(title))
        if not image_url:
            image_url = _FILM_POSTER_BY_EPISODE.get(episode_id)
        return FilmResponse(
            id=extract_id(film.get("url", "")),
            title=title,
            image_url=image_url,
            episode_id=episode_id,
            opening_crawl=film.get("opening_crawl", "") or "",
            director=film.get("director", ""),
            producer=film.get("producer", ""),
            release_date=film.get("release_date", ""),
            characters_count=len(characters_urls),
            planets_count=len(planets_urls),
            starships_count=len(starships_urls),
            vehicles_count=len(vehicles_urls),
            species_count=len(species_urls),
            planets=planets_rel or [],
            starships=starships_rel or [],
            vehicles=vehicles_rel or [],
            species=species_rel or [],
        )
