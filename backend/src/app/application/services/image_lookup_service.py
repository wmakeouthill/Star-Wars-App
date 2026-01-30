from __future__ import annotations

from typing import Dict, Optional

from app.infrastructure.cache.memory_cache import MemoryCache
from app.infrastructure.external.databank.client import DatabankClient


def _norm_name(value: str) -> str:
    return " ".join(str(value).strip().split()).casefold()


class ImageLookupService:
    """
    Resolve URLs de imagem de forma conservadora:
    - Faz match EXATO por nome (normalizado).
    - Se não tiver match, retorna None (melhor do que imagem errada).
    """

    def __init__(self, cache: MemoryCache, databank: DatabankClient) -> None:
        self._cache = cache
        self._databank = databank

    async def get_characters_index(self) -> Dict[str, str]:
        return await self._get_index("characters")

    async def get_locations_index(self) -> Dict[str, str]:
        return await self._get_index("locations")

    async def get_vehicles_index(self) -> Dict[str, str]:
        return await self._get_index("vehicles")

    async def get_species_index(self) -> Dict[str, str]:
        return await self._get_index("species")

    async def lookup_character(self, name: str) -> Optional[str]:
        idx = await self.get_characters_index()
        return idx.get(_norm_name(name))

    async def lookup_location(self, name: str) -> Optional[str]:
        idx = await self.get_locations_index()
        return idx.get(_norm_name(name))

    async def lookup_vehicle(self, name: str) -> Optional[str]:
        idx = await self.get_vehicles_index()
        return idx.get(_norm_name(name))

    async def lookup_specie(self, name: str) -> Optional[str]:
        idx = await self.get_species_index()
        return idx.get(_norm_name(name))

    async def _get_index(self, resource: str) -> Dict[str, str]:
        cache_key = f"databank:index:{resource}"
        cached = await self._cache.get(cache_key)
        if isinstance(cached, dict):
            return cached  # type: ignore[return-value]

        try:
            items = await self._databank.fetch_all(resource)
        except Exception:  # noqa: BLE001
            # Se o Databank estiver fora/instável, não derrubamos a API.
            index: Dict[str, str] = {}
            await self._cache.set(cache_key, index)
            return index

        index: Dict[str, str] = {}
        for item in items:
            name = item.get("name")
            image = item.get("image")
            if not name or not image:
                continue
            index[_norm_name(str(name))] = str(image)

        await self._cache.set(cache_key, index)
        return index

