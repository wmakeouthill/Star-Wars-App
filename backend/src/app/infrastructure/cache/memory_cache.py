from __future__ import annotations

from cachetools import TTLCache
from typing import Any, Optional


class MemoryCache:
    def __init__(self, max_size: int = 1024, ttl_seconds: int = 3600) -> None:
        self._cache = TTLCache(maxsize=max_size, ttl=ttl_seconds)

    async def get(self, key: str) -> Optional[Any]:
        return self._cache.get(key)

    async def set(self, key: str, value: Any) -> None:
        self._cache[key] = value

    async def clear(self) -> None:
        self._cache.clear()
