from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class ImageFallbackUpsertRequest(BaseModel):
    item_name: str = Field(..., min_length=1, max_length=200)
    image_url: str = Field(..., min_length=1)


class ImageFallbackSchema(BaseModel):
    id: str
    resource: str
    item_name: str
    image_url: str
    created_at: datetime
    updated_at: datetime

