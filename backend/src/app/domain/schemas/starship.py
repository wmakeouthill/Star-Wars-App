from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, ConfigDict


class StarshipResponse(BaseModel):
    id: str
    name: str
    model: str
    manufacturer: str
    starship_class: str
    crew: Optional[int] = None
    passengers: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class StarshipFilter(BaseModel):
    name: Optional[str] = None
    manufacturer: Optional[str] = None
    starship_class: Optional[str] = None
