from __future__ import annotations

import asyncio
from urllib.parse import urlencode
from typing import Any, Dict, List, Optional

import httpx

from app.infrastructure.cache.memory_cache import MemoryCache
from app.infrastructure.config.settings import get_settings


class SWAPIClient:
    def __init__(self, cache: MemoryCache) -> None:
        settings = get_settings()
        self._base_url = settings.swapi_base_url
        self._cache = cache
        self._client = httpx.AsyncClient(timeout=30.0)

    async def close(self) -> None:
        await self._client.aclose()

    def _build_url(
        self, path: str, params: Optional[Dict[str, str | int | bool | None]] = None
    ) -> str:
        base = f"{self._base_url}{path}"
        if not params:
            return base
        clean: Dict[str, str] = {}
        for key, value in params.items():
            if value is None or value == "":
                continue
            clean[key] = str(value)
        if not clean:
            return base
        return f"{base}?{urlencode(clean)}"

    async def _get_collection_page(
        self, path: str, *, page: int, search: Optional[str] = None
    ) -> Dict[str, Any]:
        url = self._build_url(path, {"page": page, "search": search})
        return await self._get_url(url)

    async def get_all_people(self) -> List[Dict[str, Any]]:
        cache_key = "swapi:people:all"
        cached = await self._cache.get(cache_key)
        if cached:
            return cached
        people = await self._paginate_all("/people")
        await self._cache.set(cache_key, people)
        return people

    async def get_people_page(self, page: int, search: Optional[str] = None) -> Dict[str, Any]:
        return await self._get_collection_page("/people", page=page, search=search)

    async def get_all_planets(self) -> List[Dict[str, Any]]:
        cache_key = "swapi:planets:all"
        cached = await self._cache.get(cache_key)
        if cached:
            return cached
        planets = await self._paginate_all("/planets")
        await self._cache.set(cache_key, planets)
        return planets

    async def get_planets_page(self, page: int, search: Optional[str] = None) -> Dict[str, Any]:
        return await self._get_collection_page("/planets", page=page, search=search)

    async def get_all_starships(self) -> List[Dict[str, Any]]:
        cache_key = "swapi:starships:all"
        cached = await self._cache.get(cache_key)
        if cached:
            return cached
        starships = await self._paginate_all("/starships")
        await self._cache.set(cache_key, starships)
        return starships

    async def get_starships_page(self, page: int, search: Optional[str] = None) -> Dict[str, Any]:
        return await self._get_collection_page("/starships", page=page, search=search)

    async def get_all_films(self) -> List[Dict[str, Any]]:
        cache_key = "swapi:films:all"
        cached = await self._cache.get(cache_key)
        if cached:
            return cached
        films = await self._paginate_all("/films")
        await self._cache.set(cache_key, films)
        return films

    async def get_films_page(self, page: int, search: Optional[str] = None) -> Dict[str, Any]:
        return await self._get_collection_page("/films", page=page, search=search)

    async def get_person(self, person_id: str) -> Dict[str, Any]:
        return await self._get_resource(f"/people/{person_id}/")

    async def get_planet(self, planet_id: str) -> Dict[str, Any]:
        return await self._get_resource(f"/planets/{planet_id}/")

    async def get_starship(self, starship_id: str) -> Dict[str, Any]:
        return await self._get_resource(f"/starships/{starship_id}/")

    async def get_film(self, film_id: str) -> Dict[str, Any]:
        return await self._get_resource(f"/films/{film_id}/")

    async def get_resources_by_urls(self, urls: List[str]) -> List[Dict[str, Any]]:
        tasks = [self.get_resource_by_url(url) for url in urls]
        return list(await asyncio.gather(*tasks))

    async def get_resource_by_url(self, url: str) -> Dict[str, Any]:
        return await self._get_url(url)

    async def _get_resource(self, path: str) -> Dict[str, Any]:
        url = f"{self._base_url}{path}"
        return await self._get_url(url)

    async def _get_url(self, url: str) -> Dict[str, Any]:
        cache_key = f"swapi:url:{url}"
        cached = await self._cache.get(cache_key)
        if cached:
            return cached
        response = await self._client.get(url)
        response.raise_for_status()
        data = response.json()
        await self._cache.set(cache_key, data)
        return data

    async def _paginate_all(self, path: str) -> List[Dict[str, Any]]:
        url = f"{self._base_url}{path}"
        items: List[Dict[str, Any]] = []
        while url:
            response = await self._client.get(url)
            response.raise_for_status()
            payload = response.json()
            items.extend(payload.get("results", []))
            url = payload.get("next")
        return items


def extract_id(resource_url: str) -> str:
    return resource_url.rstrip("/").split("/")[-1]


def normalize_number(value: Any) -> Optional[float]:
    if value in (None, "unknown", "n/a"):
        return None
    try:
        return float(str(value).replace(",", ""))
    except ValueError:
        return None
