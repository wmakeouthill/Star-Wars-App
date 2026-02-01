from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, ConfigDict


class SpeciesResponse(BaseModel):
    id: str
    name: str
    image_url: Optional[str] = None
    classification: str
    designation: str
    average_height: Optional[int] = None
    average_height_raw: Optional[str] = None
    average_lifespan: Optional[int] = None
    average_lifespan_raw: Optional[str] = None
    language: str

    model_config = ConfigDict(from_attributes=True)


class SpeciesFilter(BaseModel):
    name: Optional[str] = None
    classification: Optional[str] = None
    language: Optional[str] = None
    film_id: Optional[str] = None

