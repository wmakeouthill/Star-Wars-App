from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class PlanetResponse(BaseModel):
    id: str
    name: str
    image_url: Optional[str] = None
    climate: str
    gravity: str = ""
    terrain: str
    surface_water: Optional[int] = None
    surface_water_raw: Optional[str] = None
    diameter: Optional[int] = None
    diameter_raw: Optional[str] = None
    rotation_period: Optional[int] = None
    rotation_period_raw: Optional[str] = None
    orbital_period: Optional[int] = None
    orbital_period_raw: Optional[str] = None
    population: Optional[int] = None
    population_raw: Optional[str] = None
    residents_count: int = 0
    films: List[str] = []

    model_config = ConfigDict(from_attributes=True)


class PlanetFilter(BaseModel):
    name: Optional[str] = None
    climate: Optional[str] = None
    terrain: Optional[str] = None
    min_population: Optional[int] = None
    max_population: Optional[int] = None
