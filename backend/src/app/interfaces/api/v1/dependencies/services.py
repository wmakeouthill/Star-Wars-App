from functools import lru_cache
from fastapi import Depends

from app.application.services.character_service import CharacterService
from app.application.services.chat_service import ChatService
from app.application.services.film_service import FilmService
from app.application.services.gamification_service import GamificationService
from app.application.services.planet_service import PlanetService
from app.application.services.starship_service import StarshipService
from app.infrastructure.cache.memory_cache import MemoryCache
from app.infrastructure.config.settings import get_settings
from app.infrastructure.external.swapi.client import SWAPIClient
from app.infrastructure.external.vertex_ai.yoda_ai_service import YodaAIService


@lru_cache
def get_cache() -> MemoryCache:
    settings = get_settings()
    return MemoryCache(ttl_seconds=settings.cache_ttl_seconds)


@lru_cache
def get_swapi_client() -> SWAPIClient:
    cache = get_cache()
    return SWAPIClient(cache=cache)


def get_character_service(swapi_client: SWAPIClient = Depends(get_swapi_client)) -> CharacterService:
    return CharacterService(swapi_client=swapi_client)


def get_planet_service(swapi_client: SWAPIClient = Depends(get_swapi_client)) -> PlanetService:
    return PlanetService(swapi_client=swapi_client)


def get_starship_service(swapi_client: SWAPIClient = Depends(get_swapi_client)) -> StarshipService:
    return StarshipService(swapi_client=swapi_client)


def get_film_service(swapi_client: SWAPIClient = Depends(get_swapi_client)) -> FilmService:
    return FilmService(swapi_client=swapi_client)


def get_chat_service(swapi_client: SWAPIClient = Depends(get_swapi_client)) -> ChatService:
    return ChatService(swapi_client=swapi_client, yoda_ai=get_yoda_ai_service())


@lru_cache
def get_yoda_ai_service() -> YodaAIService:
    return YodaAIService()


@lru_cache
def get_gamification_service() -> GamificationService:
    return GamificationService()
