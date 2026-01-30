from __future__ import annotations

from typing import List, Optional, Tuple

from app.domain.exceptions.not_found import ResourceNotFoundError
from app.domain.schemas.common import PaginatedResponse, PageMeta
from app.domain.schemas.film import FilmFilter, FilmResponse
from app.domain.repositories.swapi_client import ISWAPIClient
from app.infrastructure.external.swapi.client import extract_id
from app.application.services.swapi_pagination import fetch_swapi_slice


class FilmService:
    def __init__(self, swapi_client: ISWAPIClient) -> None:
        self._swapi = swapi_client

    async def list_films(
        self,
        filters: FilmFilter,
        sort_by: Optional[str],
        sort_order: str,
        page: int,
        page_size: int,
    ) -> PaginatedResponse[FilmResponse]:
        can_use_swapi_paging = sort_by is None and not filters.director and not filters.producer

        if can_use_swapi_paging:
            raw_items, total = await fetch_swapi_slice(
                self._swapi.get_films_page, page=page, page_size=page_size, search=filters.title
            )
            total_pages = max(1, (total + page_size - 1) // page_size)
            meta = PageMeta(page=page, page_size=page_size, total=total, total_pages=total_pages)
            response_items = [self._map_film(item) for item in raw_items]
            return PaginatedResponse(items=response_items, meta=meta)

        films = await self._swapi.get_all_films()
        filtered = self._apply_filters(films, filters)
        sorted_items = self._apply_sort(filtered, sort_by, sort_order)
        page_items, meta = self._apply_pagination(sorted_items, page, page_size)
        response_items = [self._map_film(item) for item in page_items]
        return PaginatedResponse(items=response_items, meta=meta)

    async def get_film(self, film_id: str) -> FilmResponse:
        try:
            film = await self._swapi.get_film(film_id)
        except Exception as exc:  # noqa: BLE001
            raise ResourceNotFoundError("Filme", film_id) from exc
        return self._map_film(film)

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

    def _map_film(self, film: dict) -> FilmResponse:
        return FilmResponse(
            id=extract_id(film.get("url", "")),
            title=film.get("title", ""),
            episode_id=int(film.get("episode_id", 0)),
            director=film.get("director", ""),
            producer=film.get("producer", ""),
            release_date=film.get("release_date", ""),
        )
