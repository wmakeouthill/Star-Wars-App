from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.infrastructure.config.settings import get_settings
from app.interfaces.api.v1.routers import health, characters, planets, starships, films, chat, gamification


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, version=settings.app_version)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allow_origins,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router, prefix="/api/v1")
    app.include_router(characters.router, prefix="/api/v1")
    app.include_router(planets.router, prefix="/api/v1")
    app.include_router(starships.router, prefix="/api/v1")
    app.include_router(films.router, prefix="/api/v1")
    app.include_router(chat.router, prefix="/api/v1")

    app.include_router(gamification.router, prefix="/api/v1")

    return app


app = create_app()
