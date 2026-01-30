from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt

from app.infrastructure.config.settings import get_settings


@dataclass(frozen=True)
class DecodedToken:
    sub: str
    token_type: str
    exp: datetime
    iat: datetime
    jti: str | None = None


def _utc_now() -> datetime:
    return datetime.now(tz=UTC)


def create_access_token(*, user_id: str) -> tuple[str, int]:
    settings = get_settings()
    now = _utc_now()
    ttl = int(settings.jwt_access_ttl_seconds)
    exp = now + timedelta(seconds=ttl)

    payload = {
        "sub": user_id,
        "type": "access",
        "iss": settings.jwt_issuer,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
    token = jwt.encode(payload, settings.jwt_secret_key, algorithm="HS256")
    return token, ttl


def create_refresh_token(*, user_id: str, jti: str, expires_at: datetime) -> str:
    settings = get_settings()
    now = _utc_now()
    payload = {
        "sub": user_id,
        "type": "refresh",
        "jti": jti,
        "iss": settings.jwt_issuer,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm="HS256")


def decode_token(token: str, *, expected_type: str | None = None) -> DecodedToken:
    settings = get_settings()
    payload: dict[str, Any] = jwt.decode(
        token,
        settings.jwt_secret_key,
        algorithms=["HS256"],
        issuer=settings.jwt_issuer,
        options={"require": ["exp", "iat", "sub", "iss"]},
    )

    token_type = str(payload.get("type") or "")
    if expected_type and token_type != expected_type:
        raise jwt.InvalidTokenError("Tipo de token inválido.")

    exp_ts = int(payload["exp"])
    iat_ts = int(payload["iat"])
    exp = datetime.fromtimestamp(exp_ts, tz=UTC)
    iat = datetime.fromtimestamp(iat_ts, tz=UTC)

    return DecodedToken(
        sub=str(payload["sub"]),
        token_type=token_type,
        exp=exp,
        iat=iat,
        jti=str(payload["jti"]) if payload.get("jti") else None,
    )


def new_jti() -> str:
    return uuid.uuid4().hex

