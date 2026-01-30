import pytest
from unittest.mock import AsyncMock

from app.application.services.film_service import FilmService
from app.domain.schemas.film import FilmFilter


@pytest.mark.asyncio
async def test_list_films_sorts_by_episode_id():
    swapi_client = AsyncMock()
    swapi_client.get_all_films.return_value = [
        {
            "url": "https://swapi.dev/api/films/2/",
            "title": "The Empire Strikes Back",
            "episode_id": 5,
            "director": "Irvin Kershner",
            "producer": "Gary Kurtz",
            "release_date": "1980-05-17",
        },
        {
            "url": "https://swapi.dev/api/films/1/",
            "title": "A New Hope",
            "episode_id": 4,
            "director": "George Lucas",
            "producer": "Gary Kurtz",
            "release_date": "1977-05-25",
        },
    ]

    service = FilmService(swapi_client=swapi_client)
    response = await service.list_films(FilmFilter(), sort_by="episode_id", sort_order="asc", page=1, page_size=10)

    assert response.items[0].title == "A New Hope"
