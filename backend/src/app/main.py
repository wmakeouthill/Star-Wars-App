from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.infrastructure.config.settings import get_settings
from app.infrastructure.etag_middleware import ETagMiddleware
from app.interfaces.api.v1.routers import (
    auth,
    health,
    characters,
    planets,
    starships,
    films,
    chat,
    gamification,
    character_image_fallbacks,
    image_fallbacks,
    vehicles,
    species,
)

API_V1_PREFIX = "/api/v1"


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, version=settings.app_version)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allow_origins,
        # Necessário para refresh token via cookie (best practice: access token em memória + refresh httpOnly).
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["ETag"],
    )

    app.add_middleware(ETagMiddleware)

    app.include_router(health.router, prefix=API_V1_PREFIX)
    app.include_router(auth.router, prefix=API_V1_PREFIX)
    app.include_router(characters.router, prefix=API_V1_PREFIX)
    app.include_router(planets.router, prefix=API_V1_PREFIX)
    app.include_router(starships.router, prefix=API_V1_PREFIX)
    app.include_router(films.router, prefix=API_V1_PREFIX)
    app.include_router(chat.router, prefix=API_V1_PREFIX)

    app.include_router(gamification.router, prefix=API_V1_PREFIX)
    app.include_router(character_image_fallbacks.router, prefix=API_V1_PREFIX)
    app.include_router(image_fallbacks.router, prefix=API_V1_PREFIX)
    app.include_router(vehicles.router, prefix=API_V1_PREFIX)
    app.include_router(species.router, prefix=API_V1_PREFIX)

    return app


app = create_app()
