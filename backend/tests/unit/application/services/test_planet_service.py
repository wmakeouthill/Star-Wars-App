import pytest
from unittest.mock import AsyncMock

from app.application.services.planet_service import PlanetService
from app.domain.schemas.planet import PlanetFilter


@pytest.mark.asyncio
async def test_list_planets_filters_by_climate():
    swapi_client = AsyncMock()
    swapi_client.get_all_planets.return_value = [
        {
            "url": "https://swapi.dev/api/planets/1/",
            "name": "Tatooine",
            "climate": "arid",
            "terrain": "desert",
            "population": "200000",
            "films": [],
        },
        {
            "url": "https://swapi.dev/api/planets/2/",
            "name": "Hoth",
            "climate": "frozen",
            "terrain": "tundra",
            "population": "unknown",
            "films": [],
        },
    ]

    service = PlanetService(swapi_client=swapi_client)
    response = await service.list_planets(
        PlanetFilter(climate="arid"),
        sort_by=None,
        sort_order="asc",
        page=1,
        page_size=10,
    )

    assert response.meta.total == 1
    assert response.items[0].name == "Tatooine"
