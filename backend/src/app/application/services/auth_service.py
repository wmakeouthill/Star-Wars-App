from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infrastructure.config.settings import get_settings
from app.infrastructure.db.models.refresh_token import RefreshToken
from app.infrastructure.db.models.user import User
from app.infrastructure.security.jwt_service import (
    create_access_token,
    create_refresh_token,
    decode_token,
    new_jti,
)


class AuthService:
    def login_with_google(self, *, credential: str, db: Session) -> tuple[User, str, int, str, int]:
        """
        Retorna:
        - user (persistido)
        - access_token (string)
        - access_expires_in (segundos)
        - refresh_token (string - para cookie httpOnly)
        - refresh_max_age (segundos)
        """
        settings = get_settings()
        if not settings.google_oauth_client_id:
            raise HTTPException(status_code=500, detail="Google OAuth client_id não configurado no backend.")

        try:
            info = google_id_token.verify_oauth2_token(
                credential,
                google_requests.Request(),
                audience=settings.google_oauth_client_id,
            )
        except Exception:
            raise HTTPException(status_code=401, detail="Credencial Google inválida ou expirada.")

        google_sub = str(info.get("sub") or "").strip()
        if not google_sub:
            raise HTTPException(status_code=401, detail="Credencial Google inválida (sub ausente).")

        email = info.get("email")
        name = info.get("name")
        picture = info.get("picture")

        user = db.scalar(select(User).where(User.google_sub == google_sub))
        if user is None:
            user = User(google_sub=google_sub, email=email, name=name, picture=picture)
            db.add(user)
            db.flush()  # gera user.id
        else:
            user.email = email
            user.name = name
            user.picture = picture

        access_token, access_ttl = create_access_token(user_id=str(user.id))

        refresh_ttl = int(settings.jwt_refresh_ttl_seconds)
        jti = new_jti()
        refresh_expires_at = datetime.now(tz=UTC) + timedelta(seconds=refresh_ttl)

        db.add(RefreshToken(jti=jti, user_id=user.id, expires_at=refresh_expires_at))
        db.commit()

        refresh_token = create_refresh_token(user_id=str(user.id), jti=jti, expires_at=refresh_expires_at)
        return user, access_token, access_ttl, refresh_token, refresh_ttl

    def refresh_session(self, *, refresh_token: str, db: Session) -> tuple[User, str, int, str, int]:
        settings = get_settings()
        try:
            decoded = decode_token(refresh_token, expected_type="refresh")
        except Exception:
            raise HTTPException(status_code=401, detail="Refresh token inválido ou expirado.")

        if not decoded.jti:
            raise HTTPException(status_code=401, detail="Refresh token inválido (jti ausente).")

        token_row = db.scalar(select(RefreshToken).where(RefreshToken.jti == decoded.jti))
        if token_row is None or token_row.revoked_at is not None:
            raise HTTPException(status_code=401, detail="Refresh token revogado.")

        now = datetime.now(tz=UTC)
        if token_row.expires_at <= now:
            raise HTTPException(status_code=401, detail="Refresh token expirado.")

        user = db.scalar(select(User).where(User.id == token_row.user_id))
        if user is None:
            raise HTTPException(status_code=401, detail="Usuário não encontrado.")

        # Rotação
        token_row.revoked_at = now
        access_token, access_ttl = create_access_token(user_id=str(user.id))

        refresh_ttl = int(settings.jwt_refresh_ttl_seconds)
        refresh_expires_at = now + timedelta(seconds=refresh_ttl)
        new_refresh_jti = new_jti()
        db.add(RefreshToken(jti=new_refresh_jti, user_id=user.id, expires_at=refresh_expires_at))
        db.commit()

        new_refresh_token = create_refresh_token(
            user_id=str(user.id), jti=new_refresh_jti, expires_at=refresh_expires_at
        )
        return user, access_token, access_ttl, new_refresh_token, refresh_ttl

    def logout(self, *, refresh_token: str | None, db: Session) -> None:
        if not refresh_token:
            return

        try:
            decoded = decode_token(refresh_token, expected_type="refresh")
        except Exception:
            return

        if not decoded.jti:
            return

        token_row = db.scalar(select(RefreshToken).where(RefreshToken.jti == decoded.jti))
        if token_row and token_row.revoked_at is None:
            token_row.revoked_at = datetime.now(tz=UTC)
            db.commit()

