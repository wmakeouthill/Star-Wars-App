from __future__ import annotations

import asyncio
from cachetools import TTLCache
from typing import Any, Optional


class MemoryCache:
    def __init__(self, max_size: int = 1024, ttl_seconds: int = 3600) -> None:
        self._cache = TTLCache(maxsize=max_size, ttl=ttl_seconds)

    async def get(self, key: str) -> Optional[Any]:
        return await asyncio.to_thread(self._cache.get, key)

    async def set(self, key: str, value: Any) -> None:
        def _set() -> None:
            self._cache[key] = value

        await asyncio.to_thread(_set)

    async def delete(self, key: str) -> None:
        def _delete() -> None:
            try:
                del self._cache[key]
            except KeyError:
                return

        await asyncio.to_thread(_delete)

    async def clear(self) -> None:
        await asyncio.to_thread(self._cache.clear)
