from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.schemas.image_fallback import ImageFallbackSchema, ImageFallbackUpsertRequest
from app.infrastructure.cache.memory_cache import MemoryCache
from app.infrastructure.db.models.image_fallback import ImageFallback
from app.infrastructure.db.models.user import User
from app.infrastructure.db.session import get_db
from app.interfaces.api.v1.dependencies.auth import require_authenticated_user_id
from app.interfaces.api.v1.dependencies.services import get_cache


router = APIRouter(prefix="/admin/image-fallbacks", tags=["Admin: Image Fallbacks"])

IMAGE_FALLBACK_EDITOR_EMAIL = "wcacorreia1995@gmail.com"

ALLOWED_RESOURCES: set[str] = {
    "characters",
    "locations",
    "planets",
    "starships",
    "vehicles",
    "species",
    "films",
}


def _norm_name(value: str) -> str:
    return " ".join(str(value).strip().split()).casefold()


def _norm_resource(value: str) -> str:
    return str(value).strip().strip("/").casefold()


def _require_image_fallback_admin_user(
    user_id: str = Depends(require_authenticated_user_id),
    db: Session = Depends(get_db),
) -> str:
    """
    Regra de autorização do MVP:
    apenas o usuário com email específico pode editar fallbacks de imagem.
    """
    user = db.get(User, uuid.UUID(user_id))
    email = (user.email if user else None) or ""
    if email.strip().casefold() != IMAGE_FALLBACK_EDITOR_EMAIL.casefold():
        raise HTTPException(status_code=403, detail="Sem permissão para editar fallbacks de imagem.")
    return user_id


def _validate_resource(resource: str) -> str:
    normalized = _norm_resource(resource)
    # Suporte a alias: planets -> locations (o Databank chama de locations; o app pode usar planets em UI).
    if normalized == "planets":
        normalized = "locations"
    if normalized not in ALLOWED_RESOURCES:
        raise HTTPException(status_code=400, detail="Recurso inválido para fallback de imagem.")
    return normalized


@router.get("/{resource}", response_model=list[ImageFallbackSchema])
async def list_fallbacks(
    resource: str = Path(..., description="Recurso (characters, locations, starships, vehicles, species, films)"),
    search: str | None = Query(None, description="Filtra por nome (contains)"),
    _user_id: str = Depends(_require_image_fallback_admin_user),
    db: Session = Depends(get_db),
):
    resolved_resource = _validate_resource(resource)
    stmt = (
        select(ImageFallback)
        .where(ImageFallback.resource == resolved_resource)
        .order_by(ImageFallback.updated_at.desc())
    )
    if search and search.strip():
        like = f"%{search.strip()}%"
        stmt = stmt.where(ImageFallback.item_name.ilike(like))
    rows = db.scalars(stmt).all()
    return [
        ImageFallbackSchema(
            id=str(r.id),
            resource=r.resource,
            item_name=r.item_name,
            image_url=r.image_url,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in rows
    ]


@router.post("/{resource}", response_model=ImageFallbackSchema)
async def upsert_fallback(
    payload: ImageFallbackUpsertRequest,
    resource: str = Path(..., description="Recurso (characters, locations, starships, vehicles, species, films)"),
    _user_id: str = Depends(_require_image_fallback_admin_user),
    db: Session = Depends(get_db),
    cache: MemoryCache = Depends(get_cache),
):
    resolved_resource = _validate_resource(resource)

    name = payload.item_name.strip()
    name_norm = _norm_name(name)
    if not name_norm:
        raise HTTPException(status_code=400, detail="Nome inválido.")

    image_url = payload.image_url.strip()
    if not image_url:
        raise HTTPException(status_code=400, detail="URL de imagem inválida.")

    existing = db.scalar(
        select(ImageFallback)
        .where(ImageFallback.resource == resolved_resource)
        .where(ImageFallback.item_name_norm == name_norm)
    )
    if existing is None:
        row = ImageFallback(
            resource=resolved_resource,
            item_name=name,
            item_name_norm=name_norm,
            image_url=image_url,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
    else:
        existing.item_name = name
        existing.image_url = image_url
        db.commit()
        row = existing

    # Garante que a nova imagem apareça imediatamente nos endpoints que usam cache.
    await cache.delete(f"images:index:{resolved_resource}")

    return ImageFallbackSchema(
        id=str(row.id),
        resource=row.resource,
        item_name=row.item_name,
        image_url=row.image_url,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.delete("/{resource}/{fallback_id}")
async def delete_fallback(
    fallback_id: str,
    resource: str = Path(..., description="Recurso (characters, locations, starships, vehicles, species, films)"),
    _user_id: str = Depends(_require_image_fallback_admin_user),
    db: Session = Depends(get_db),
    cache: MemoryCache = Depends(get_cache),
):
    resolved_resource = _validate_resource(resource)
    row = db.get(ImageFallback, uuid.UUID(fallback_id))
    if row is None or row.resource != resolved_resource:
        raise HTTPException(status_code=404, detail="Registro não encontrado.")
    db.delete(row)
    db.commit()
    await cache.delete(f"images:index:{resolved_resource}")
    return {"ok": True}

