import pytest
from unittest.mock import AsyncMock

from app.application.services.character_service import CharacterService
from app.domain.schemas.character import CharacterFilter


@pytest.mark.asyncio
async def test_list_characters_by_film_returns_paginated_items():
    swapi_client = AsyncMock()
    swapi_client.get_film.return_value = {
        "characters": [
            "https://swapi.dev/api/people/1/",
            "https://swapi.dev/api/people/2/",
        ]
    }
    swapi_client.get_resources_by_urls.return_value = [
        {
            "url": "https://swapi.dev/api/people/1/",
            "name": "Luke Skywalker",
            "height": "172",
            "mass": "77",
            "hair_color": "blond",
            "skin_color": "fair",
            "eye_color": "blue",
            "birth_year": "19BBY",
            "gender": "male",
        },
        {
            "url": "https://swapi.dev/api/people/2/",
            "name": "C-3PO",
            "height": "167",
            "mass": "75",
            "hair_color": "n/a",
            "skin_color": "gold",
            "eye_color": "yellow",
            "birth_year": "112BBY",
            "gender": "n/a",
        },
    ]

    service = CharacterService(swapi_client=swapi_client)

    response = await service.list_characters_by_film("1", page=1, page_size=1)

    assert response.meta.total == 2
    assert len(response.items) == 1
    assert response.items[0].name == "Luke Skywalker"


@pytest.mark.asyncio
async def test_list_characters_filters_by_gender():
    swapi_client = AsyncMock()
    swapi_client.get_all_people.return_value = [
        {
            "url": "https://swapi.dev/api/people/1/",
            "name": "Leia Organa",
            "height": "150",
            "mass": "49",
            "hair_color": "brown",
            "skin_color": "light",
            "eye_color": "brown",
            "birth_year": "19BBY",
            "gender": "female",
            "homeworld": "https://swapi.dev/api/planets/2/",
            "films": [],
        },
        {
            "url": "https://swapi.dev/api/people/2/",
            "name": "Han Solo",
            "height": "180",
            "mass": "80",
            "hair_color": "brown",
            "skin_color": "light",
            "eye_color": "brown",
            "birth_year": "29BBY",
            "gender": "male",
            "homeworld": "https://swapi.dev/api/planets/22/",
            "films": [],
        },
    ]

    service = CharacterService(swapi_client=swapi_client)
    filters = CharacterFilter(gender="female")

    response = await service.list_characters(filters, sort_by=None, sort_order="asc", page=1, page_size=10)

    assert response.meta.total == 1
    assert response.items[0].name == "Leia Organa"
