from __future__ import annotations

from typing import Any, Dict, List, Optional

import httpx


class DatabankClient:
    """
    Cliente simples para o Star Wars Databank (Vercel).

    Importante:
    - Não existe relação 1:1 por ID com a SWAPI.
    - Aqui nós baixamos catálogos por tipo e fazemos lookup por NOME (match exato normalizado).
    """

    def __init__(
        self,
        base_url: str = "https://starwars-databank-server.vercel.app/api/v1",
        timeout_seconds: float = 30.0,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout_seconds

    async def fetch_all(self, resource: str, *, limit: int = 250) -> List[Dict[str, Any]]:
        """
        Baixa TODOS os itens de um recurso (ex.: 'characters', 'vehicles', 'locations', 'species').
        Retorna a lista do campo `data`.
        """
        resource = resource.strip().strip("/")
        page = 1
        all_items: List[Dict[str, Any]] = []

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            while True:
                url = f"{self._base_url}/{resource}"
                resp = await client.get(url, params={"page": page, "limit": limit})
                resp.raise_for_status()
                payload = resp.json()

                data = payload.get("data") or []
                if not isinstance(data, list):
                    break
                all_items.extend(data)

                info = payload.get("info") or {}
                next_path: Optional[str] = info.get("next")
                if not next_path:
                    break
                page += 1

        return all_items

