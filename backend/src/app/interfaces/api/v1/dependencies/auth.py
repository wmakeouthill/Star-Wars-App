from __future__ import annotations

from fastapi import Header, HTTPException
from fastapi.security.utils import get_authorization_scheme_param

from app.infrastructure.security.jwt_service import decode_token


def get_current_user_id(
    authorization: str | None = Header(default=None, alias="Authorization"),
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> str:
    """
    Identificação de usuário (compatível com o MVP atual):

    - Preferência: JWT em `Authorization: Bearer <token>` (sub = user_id).
    - Fallback: `X-User-Id` (persistido no frontend) para modo convidado/sem login.
    """
    if authorization:
        scheme, param = get_authorization_scheme_param(authorization)
        if scheme.lower() == "bearer" and param:
            try:
                decoded = decode_token(param, expected_type="access")
                return decoded.sub
            except Exception:
                # Para endpoints "semi-públicos" (MVP), não bloqueia; deixa cair no fallback.
                pass

    user_id = (x_user_id or "guest").strip()
    return user_id or "guest"


def require_authenticated_user_id(
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Não autenticado.")
    scheme, param = get_authorization_scheme_param(authorization)
    if scheme.lower() != "bearer" or not param:
        raise HTTPException(status_code=401, detail="Bearer token ausente.")
    try:
        decoded = decode_token(param, expected_type="access")
        return decoded.sub
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado.")

