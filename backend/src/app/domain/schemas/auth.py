from __future__ import annotations

from pydantic import BaseModel


class GoogleLoginRequest(BaseModel):
    credential: str


class UserSchema(BaseModel):
    id: str
    email: str | None = None
    name: str | None = None
    picture: str | None = None


class AuthSessionResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserSchema

