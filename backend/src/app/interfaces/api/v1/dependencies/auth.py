from __future__ import annotations

from fastapi import Header


def get_current_user_id(x_user_id: str | None = Header(default=None, alias="X-User-Id")) -> str:
    """
    MVP de identificação de usuário (sem autenticação).

    - Frontend envia `X-User-Id` (persistido em localStorage).
    - Backend usa isso para manter perfil de XP/rank/achievements em memória.
    """
    user_id = (x_user_id or "guest").strip()
    return user_id or "guest"

