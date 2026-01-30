from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class CharacterImageFallbackUpsertRequest(BaseModel):
    character_name: str = Field(..., min_length=1, max_length=200)
    image_url: str = Field(..., min_length=1)


class CharacterImageFallbackSchema(BaseModel):
    id: str
    character_name: str
    image_url: str
    created_at: datetime
    updated_at: datetime

