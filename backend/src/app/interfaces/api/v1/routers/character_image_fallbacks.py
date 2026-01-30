from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.schemas.character_image_fallback import (
    CharacterImageFallbackSchema,
    CharacterImageFallbackUpsertRequest,
)
from app.infrastructure.db.models.character_image_fallback import CharacterImageFallback
from app.infrastructure.db.session import get_db
from app.interfaces.api.v1.dependencies.auth import require_authenticated_user_id


router = APIRouter(prefix="/admin/character-image-fallbacks", tags=["Admin: Character Image Fallbacks"])


def _norm_name(value: str) -> str:
    return " ".join(str(value).strip().split()).casefold()


@router.get("/", response_model=list[CharacterImageFallbackSchema])
def list_fallbacks(
    search: str | None = Query(None, description="Filtra por nome (contains)"),
    _user_id: str = Depends(require_authenticated_user_id),
    db: Session = Depends(get_db),
):
    stmt = select(CharacterImageFallback).order_by(CharacterImageFallback.updated_at.desc())
    if search and search.strip():
        like = f"%{search.strip()}%"
        stmt = stmt.where(CharacterImageFallback.character_name.ilike(like))
    rows = db.scalars(stmt).all()
    return [
        CharacterImageFallbackSchema(
            id=str(r.id),
            character_name=r.character_name,
            image_url=r.image_url,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in rows
    ]


@router.post("/", response_model=CharacterImageFallbackSchema)
def upsert_fallback(
    payload: CharacterImageFallbackUpsertRequest,
    _user_id: str = Depends(require_authenticated_user_id),
    db: Session = Depends(get_db),
):
    name = payload.character_name.strip()
    name_norm = _norm_name(name)
    if not name_norm:
        raise HTTPException(status_code=400, detail="Nome do personagem inválido.")

    existing = db.scalar(select(CharacterImageFallback).where(CharacterImageFallback.character_name_norm == name_norm))
    if existing is None:
        row = CharacterImageFallback(character_name=name, character_name_norm=name_norm, image_url=payload.image_url)
        db.add(row)
        db.commit()
        db.refresh(row)
    else:
        existing.character_name = name
        existing.image_url = payload.image_url
        db.commit()
        row = existing

    return CharacterImageFallbackSchema(
        id=str(row.id),
        character_name=row.character_name,
        image_url=row.image_url,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.delete("/{fallback_id}")
def delete_fallback(
    fallback_id: str,
    _user_id: str = Depends(require_authenticated_user_id),
    db: Session = Depends(get_db),
):
    row = db.get(CharacterImageFallback, uuid.UUID(fallback_id))
    if row is None:
        raise HTTPException(status_code=404, detail="Registro não encontrado.")
    db.delete(row)
    db.commit()
    return {"ok": True}

