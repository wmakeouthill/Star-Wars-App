import pytest
from unittest.mock import AsyncMock

from app.application.services.starship_service import StarshipService
from app.domain.schemas.starship import StarshipFilter


@pytest.mark.asyncio
async def test_list_starships_filters_by_manufacturer():
    swapi_client = AsyncMock()
    swapi_client.get_all_starships.return_value = [
        {
            "url": "https://swapi.dev/api/starships/10/",
            "name": "Millennium Falcon",
            "model": "YT-1300 light freighter",
            "manufacturer": "Corellian Engineering Corporation",
            "starship_class": "Light freighter",
            "crew": "4",
            "passengers": "6",
        },
        {
            "url": "https://swapi.dev/api/starships/12/",
            "name": "X-wing",
            "model": "T-65 X-wing",
            "manufacturer": "Incom Corporation",
            "starship_class": "Starfighter",
            "crew": "1",
            "passengers": "0",
        },
    ]

    service = StarshipService(swapi_client=swapi_client)
    response = await service.list_starships(
        StarshipFilter(manufacturer="Corellian"),
        sort_by=None,
        sort_order="asc",
        page=1,
        page_size=10,
    )

    assert response.meta.total == 1
    assert response.items[0].name == "Millennium Falcon"
