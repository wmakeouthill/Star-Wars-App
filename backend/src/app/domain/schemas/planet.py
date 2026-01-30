from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class PlanetResponse(BaseModel):
    id: str
    name: str
    climate: str
    terrain: str
    population: Optional[int] = None
    films: List[str] = []

    model_config = ConfigDict(from_attributes=True)


class PlanetFilter(BaseModel):
    name: Optional[str] = None
    climate: Optional[str] = None
    terrain: Optional[str] = None
    min_population: Optional[int] = None
    max_population: Optional[int] = None
