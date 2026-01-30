from functools import lru_cache
from fastapi import Depends

from app.application.services.character_service import CharacterService
from app.application.services.chat_service import ChatService
from app.application.services.film_service import FilmService
from app.application.services.gamification_service import GamificationService
from app.application.services.image_lookup_service import ImageLookupService
from app.application.services.planet_service import PlanetService
from app.application.services.species_service import SpeciesService
from app.application.services.starship_service import StarshipService
from app.application.services.vehicle_service import VehicleService
from app.infrastructure.cache.memory_cache import MemoryCache
from app.infrastructure.config.settings import get_settings
from app.infrastructure.external.databank.client import DatabankClient
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


@lru_cache
def get_databank_client() -> DatabankClient:
    return DatabankClient()


def get_image_lookup_service(cache: MemoryCache = Depends(get_cache)) -> ImageLookupService:
    return ImageLookupService(cache=cache, databank=get_databank_client())


def get_character_service(
    swapi_client: SWAPIClient = Depends(get_swapi_client),
    images: ImageLookupService = Depends(get_image_lookup_service),
) -> CharacterService:
    return CharacterService(swapi_client=swapi_client, images=images)


def get_planet_service(
    swapi_client: SWAPIClient = Depends(get_swapi_client),
    images: ImageLookupService = Depends(get_image_lookup_service),
) -> PlanetService:
    return PlanetService(swapi_client=swapi_client, images=images)


def get_starship_service(
    swapi_client: SWAPIClient = Depends(get_swapi_client),
    images: ImageLookupService = Depends(get_image_lookup_service),
) -> StarshipService:
    return StarshipService(swapi_client=swapi_client, images=images)


def get_vehicle_service(
    swapi_client: SWAPIClient = Depends(get_swapi_client),
    images: ImageLookupService = Depends(get_image_lookup_service),
) -> VehicleService:
    return VehicleService(swapi_client=swapi_client, images=images)


def get_species_service(
    swapi_client: SWAPIClient = Depends(get_swapi_client),
    images: ImageLookupService = Depends(get_image_lookup_service),
) -> SpeciesService:
    return SpeciesService(swapi_client=swapi_client, images=images)


def get_film_service(swapi_client: SWAPIClient = Depends(get_swapi_client)) -> FilmService:
    return FilmService(swapi_client=swapi_client)


def get_chat_service(swapi_client: SWAPIClient = Depends(get_swapi_client)) -> ChatService:
    return ChatService(swapi_client=swapi_client, yoda_ai=get_yoda_ai_service())


@lru_cache
def get_yoda_ai_service() -> YodaAIService | None:
    settings = get_settings()
    if not settings.ai_enabled:
        return None
    return YodaAIService()


@lru_cache
def get_gamification_service() -> GamificationService:
    return GamificationService()
