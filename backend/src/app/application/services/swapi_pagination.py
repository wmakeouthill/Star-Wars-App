from __future__ import annotations

import asyncio
from typing import Any, Awaitable, Callable, Dict, List, Optional, Tuple

# O SWAPI usa paginação fixa de 10 itens por página.
SWAPI_PAGE_SIZE = 10


async def fetch_swapi_slice(
    fetch_page: Callable[[int, Optional[str]], Awaitable[Dict[str, Any]]],
    *,
    page: int,
    page_size: int,
    search: Optional[str] = None,
    swapi_page_size: int = SWAPI_PAGE_SIZE,
) -> Tuple[List[Dict[str, Any]], int]:
    """
    Retorna apenas o recorte necessário para (page, page_size) *sem* baixar tudo do SWAPI.

    Observações:
    - Para manter a meta (total/total_pages) correta, consultamos 1 página do SWAPI para obter o "count".
    - O SWAPI não permite controlar page_size (é fixo), então buscamos só as páginas necessárias e fatiamos.
    """
    if page < 1:
        raise ValueError("page deve ser >= 1")
    if page_size < 1:
        raise ValueError("page_size deve ser >= 1")

    # Sempre pegamos a página 1 para descobrir o total (count). Isso fica cacheado pelo SWAPIClient.
    first = await fetch_page(1, search)
    total = int(first.get("count") or 0)
    if total <= 0:
        return [], 0

    start_index = (page - 1) * page_size
    end_index = start_index + page_size
    if start_index >= total:
        return [], total

    start_swapi_page = (start_index // swapi_page_size) + 1
    end_swapi_page = ((end_index - 1) // swapi_page_size) + 1

    payloads: Dict[int, Dict[str, Any]] = {}
    pages: List[int] = []
    tasks: List[Awaitable[Dict[str, Any]]] = []

    for p in range(start_swapi_page, end_swapi_page + 1):
        if p == 1:
            payloads[1] = first
            continue
        pages.append(p)
        tasks.append(fetch_page(p, search))

    if tasks:
        results = await asyncio.gather(*tasks)
        for p, payload in zip(pages, results):
            payloads[p] = payload

    window: List[Dict[str, Any]] = []
    for p in range(start_swapi_page, end_swapi_page + 1):
        window.extend(payloads.get(p, {}).get("results", []))

    offset = start_index - ((start_swapi_page - 1) * swapi_page_size)
    return window[offset : offset + page_size], total

