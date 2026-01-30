from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Request, Response
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.application.services.auth_service import AuthService
from app.domain.schemas.auth import AuthSessionResponse, GoogleLoginRequest, UserSchema
from app.infrastructure.config.settings import get_settings
from app.infrastructure.db.session import get_db
from app.infrastructure.db.models.user import User
from app.interfaces.api.v1.dependencies.auth import require_authenticated_user_id


router = APIRouter(prefix="/auth", tags=["Auth"])


def _set_refresh_cookie(response: Response, refresh_token: str, max_age_seconds: int) -> None:
    settings = get_settings()
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=bool(settings.auth_cookie_secure),
        samesite=str(settings.auth_cookie_samesite).lower(),
        max_age=int(max_age_seconds),
        path="/api/v1/auth",
    )


def _clear_refresh_cookie(response: Response) -> None:
    settings = get_settings()
    response.delete_cookie(
        key="refresh_token",
        path="/api/v1/auth",
        secure=bool(settings.auth_cookie_secure),
        samesite=str(settings.auth_cookie_samesite).lower(),
    )


def _to_user_schema(user: User) -> UserSchema:
    return UserSchema(
        id=str(user.id),
        email=user.email,
        name=user.name,
        picture=user.picture,
    )


@router.post("/google", response_model=AuthSessionResponse)
def login_google(payload: GoogleLoginRequest, response: Response, db: Session = Depends(get_db)):
    service = AuthService()
    user, access_token, access_ttl, refresh_token, refresh_ttl = service.login_with_google(
        credential=payload.credential, db=db
    )
    _set_refresh_cookie(response, refresh_token, refresh_ttl)
    return AuthSessionResponse(access_token=access_token, expires_in=access_ttl, user=_to_user_schema(user))


@router.post(
    "/refresh",
    response_model=AuthSessionResponse,
    responses={204: {"description": "Sem sessão (nenhum refresh_token válido)."}},
)
def refresh_session(request: Request, response: Response, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    # UX: quando não há sessão (sem cookie), não retornamos 401 para evitar "erro" na tela de login.
    if not refresh_token:
        return Response(status_code=204)
    service = AuthService()
    try:
        user, access_token, access_ttl, new_refresh_token, refresh_ttl = service.refresh_session(
            refresh_token=refresh_token, db=db
        )
        _set_refresh_cookie(response, new_refresh_token, refresh_ttl)
        return AuthSessionResponse(access_token=access_token, expires_in=access_ttl, user=_to_user_schema(user))
    except HTTPException as exc:
        # Refresh inválido/expirado/revogado -> trata como "sem sessão".
        if exc.status_code == 401:
            _clear_refresh_cookie(response)
            return Response(status_code=204)
        raise


@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    AuthService().logout(refresh_token=refresh_token, db=db)
    _clear_refresh_cookie(response)
    return {"ok": True}


@router.get("/me", response_model=UserSchema)
def me(user_id: str = Depends(require_authenticated_user_id), db: Session = Depends(get_db)):
    # user_id é o UUID em string do access token
    user = db.get(User, uuid.UUID(user_id))
    if user is None:
        return UserSchema(id=user_id, email=None, name=None, picture=None)
    return _to_user_schema(user)

