from __future__ import annotations

from collections.abc import Generator
from functools import lru_cache

from fastapi import HTTPException
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.exc import SQLAlchemyError

from app.infrastructure.config.settings import get_settings


@lru_cache
def get_engine() -> Engine:
    settings = get_settings()
    return create_engine(
        settings.sqlalchemy_database_url,
        pool_pre_ping=True,
        future=True,
    )


@lru_cache
def get_sessionmaker() -> sessionmaker[Session]:
    engine = get_engine()
    return sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db() -> Generator[Session, None, None]:
    try:
        SessionLocal = get_sessionmaker()
        db = SessionLocal()
    except ValueError as e:
        # Ex.: config de banco incompleta (DATABASE_URL / DATABASE_HOST etc.)
        # Importante transformar em HTTPException para que o FastAPI gere resposta
        # e o CORS consiga anexar os headers corretamente.
        raise HTTPException(status_code=500, detail=str(e))
    except SQLAlchemyError:
        # Ex.: driver/URL inválida, banco fora do ar, etc.
        raise HTTPException(status_code=503, detail="Banco de dados indisponível.")
    try:
        yield db
    finally:
        db.close()

