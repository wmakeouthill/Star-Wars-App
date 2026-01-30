from __future__ import annotations

from typing import Optional, List
from pydantic import BaseModel, ConfigDict

from app.domain.schemas.resource import NamedResourceSummary


class FilmResponse(BaseModel):
    id: str
    title: str
    image_url: Optional[str] = None
    episode_id: int
    opening_crawl: str = ""
    director: str
    producer: str
    release_date: str
    characters_count: int = 0
    planets_count: int = 0
    starships_count: int = 0
    vehicles_count: int = 0
    species_count: int = 0
    planets: List[NamedResourceSummary] = []
    starships: List[NamedResourceSummary] = []
    vehicles: List[NamedResourceSummary] = []
    species: List[NamedResourceSummary] = []

    model_config = ConfigDict(from_attributes=True)


class FilmFilter(BaseModel):
    title: Optional[str] = None
    director: Optional[str] = None
    producer: Optional[str] = None
