from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict

from app.domain.schemas.resource import NamedResourceSummary


class PlanetSummary(BaseModel):
    id: str
    name: str


class FilmSummary(BaseModel):
    id: str
    title: str


class CharacterResponse(BaseModel):
    id: str
    name: str
    image_url: Optional[str] = None
    height: Optional[int] = Field(None, description="Altura em centímetros")
    height_raw: Optional[str] = Field(None, description="Valor bruto vindo da SWAPI (pode ser faixa/unidade)")
    height_min: Optional[int] = Field(None, description="Mínimo quando a SWAPI retorna faixa")
    height_max: Optional[int] = Field(None, description="Máximo quando a SWAPI retorna faixa")
    mass: Optional[float] = Field(None, description="Massa em kg")
    mass_raw: Optional[str] = Field(None, description="Valor bruto vindo da SWAPI (pode ser faixa/unidade)")
    mass_min: Optional[float] = Field(None, description="Mínimo quando a SWAPI retorna faixa")
    mass_max: Optional[float] = Field(None, description="Máximo quando a SWAPI retorna faixa")
    hair_color: str
    skin_color: str
    eye_color: str
    birth_year: str
    gender: str
    homeworld: Optional[PlanetSummary] = None
    films: List[FilmSummary] = []
    species: List[NamedResourceSummary] = []
    vehicles: List[NamedResourceSummary] = []
    starships: List[NamedResourceSummary] = []

    model_config = ConfigDict(from_attributes=True)


class CharacterFilter(BaseModel):
    name: Optional[str] = None
    gender: Optional[str] = None
    homeworld: Optional[str] = None
    film_id: Optional[str] = None
    min_height: Optional[int] = None
    max_height: Optional[int] = None
