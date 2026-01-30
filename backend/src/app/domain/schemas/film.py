from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, ConfigDict


class FilmResponse(BaseModel):
    id: str
    title: str
    episode_id: int
    director: str
    producer: str
    release_date: str

    model_config = ConfigDict(from_attributes=True)


class FilmFilter(BaseModel):
    title: Optional[str] = None
    director: Optional[str] = None
    producer: Optional[str] = None
