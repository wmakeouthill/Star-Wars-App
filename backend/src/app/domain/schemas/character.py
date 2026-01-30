from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class PlanetSummary(BaseModel):
    id: str
    name: str


class FilmSummary(BaseModel):
    id: str
    title: str


class CharacterResponse(BaseModel):
    id: str
    name: str
    height: Optional[int] = Field(None, description="Altura em centímetros")
    mass: Optional[float] = Field(None, description="Massa em kg")
    hair_color: str
    skin_color: str
    eye_color: str
    birth_year: str
    gender: str
    homeworld: Optional[PlanetSummary] = None
    films: List[FilmSummary] = []

    model_config = ConfigDict(from_attributes=True)


class CharacterFilter(BaseModel):
    name: Optional[str] = None
    gender: Optional[str] = None
    homeworld: Optional[str] = None
    film_id: Optional[str] = None
    min_height: Optional[int] = None
    max_height: Optional[int] = None
