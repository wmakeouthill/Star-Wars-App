from __future__ import annotations

import asyncio
from typing import Dict, Optional

from sqlalchemy import select  # type: ignore[reportMissingImports]

from app.infrastructure.cache.memory_cache import MemoryCache
from app.infrastructure.db.models.character_image_fallback import CharacterImageFallback
from app.infrastructure.db.models.image_fallback import ImageFallback
from app.infrastructure.db.session import get_sessionmaker
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

    async def get_films_index(self) -> Dict[str, str]:
        return await self._get_index_with_fallback("films")

    async def get_characters_index(self) -> Dict[str, str]:
        # Compatibilidade: usa a tabela legada + a tabela genérica (resource=characters)
        return await self._get_index_with_fallback("characters", include_legacy_character_fallback=True)

    async def get_locations_index(self) -> Dict[str, str]:
        return await self._get_index_with_fallback("locations")

    async def get_starships_index(self) -> Dict[str, str]:
        """
        O Databank pode expor 'starships' diretamente, mas no MVP anterior as imagens
        de naves eram obtidas via catálogo 'vehicles'. Para não regredir, fazemos fallback
        para 'vehicles' quando 'starships' não retornar nada.

        Banco de dados tem precedência sobre o Databank.
        """
        cache_key = "images:index:starships"
        cached = await self._cache.get(cache_key)
        if isinstance(cached, dict):
            return cached  # type: ignore[return-value]

        databank_index = await self._get_index("starships")
        if not databank_index:
            databank_index = await self._get_index("vehicles")

        fallback_index = await self._get_image_fallback_index("starships")
        # Banco de dados tem precedência: começa com databank, fallback sobrescreve
        merged: Dict[str, str] = dict(databank_index)
        merged.update(fallback_index)
        await self._cache.set(cache_key, merged)
        return merged

    async def get_vehicles_index(self) -> Dict[str, str]:
        return await self._get_index_with_fallback("vehicles")

    async def get_species_index(self) -> Dict[str, str]:
        return await self._get_index_with_fallback("species")

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

    async def _get_index_with_fallback(
        self,
        resource: str,
        *,
        include_legacy_character_fallback: bool = False,
    ) -> Dict[str, str]:
        """
        Cache do índice final (databank + fallback DB por recurso).

        Regra: o fallback do banco SEMPRE tem precedência; o Databank só entra quando
        a chave não existir no índice do banco.
        """
        resource = resource.strip().strip("/")
        cache_key = f"images:index:{resource}"
        cached = await self._cache.get(cache_key)
        if isinstance(cached, dict):
            return cached  # type: ignore[return-value]

        databank_index = await self._get_index(resource)
        fallback_index = await self._get_image_fallback_index(resource)
        if include_legacy_character_fallback and resource == "characters":
            legacy = await self._get_character_fallback_index()
            merged_fallback: Dict[str, str] = dict(legacy)
            merged_fallback.update(fallback_index)
            fallback_index = merged_fallback

        # Banco de dados tem precedência: começa com databank, fallback sobrescreve
        merged: Dict[str, str] = dict(databank_index)
        merged.update(fallback_index)

        await self._cache.set(cache_key, merged)
        return merged

    async def _get_character_fallback_index(self) -> Dict[str, str]:
        """
        Índice vindo do PostgreSQL:
        - chave: nome normalizado (casefold)
        - valor: URL de imagem
        """
        def _load() -> Dict[str, str]:
            session_local = get_sessionmaker()
            with session_local() as db:
                rows = db.execute(select(CharacterImageFallback.character_name_norm, CharacterImageFallback.image_url)).all()
                return {str(name_norm): str(url) for (name_norm, url) in rows if name_norm and url}

        try:
            return await asyncio.to_thread(_load)
        except Exception:  # noqa: BLE001
            return {}

    async def _get_image_fallback_index(self, resource: str) -> Dict[str, str]:
        """
        Índice vindo do PostgreSQL (tabela genérica):
        - chave: nome normalizado (casefold)
        - valor: URL de imagem
        """
        resource = resource.strip().strip("/").casefold()

        def _load() -> Dict[str, str]:
            session_local = get_sessionmaker()
            with session_local() as db:
                rows = db.execute(
                    select(ImageFallback.item_name_norm, ImageFallback.image_url).where(ImageFallback.resource == resource)
                ).all()
                return {str(name_norm): str(url) for (name_norm, url) in rows if name_norm and url}

        try:
            return await asyncio.to_thread(_load)
        except Exception:  # noqa: BLE001
            return {}

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

