from __future__ import annotations

from typing import Optional, List
from pydantic import BaseModel, ConfigDict

from app.domain.schemas.resource import NamedResourceSummary, TitledResourceSummary


class StarshipResponse(BaseModel):
    id: str
    name: str
    image_url: Optional[str] = None
    model: str
    manufacturer: str
    starship_class: str
    hyperdrive_rating: Optional[float] = None
    hyperdrive_rating_raw: Optional[str] = None
    mglt: Optional[int] = None
    mglt_raw: Optional[str] = None
    cost_in_credits: Optional[int] = None
    cost_in_credits_raw: Optional[str] = None
    length: Optional[float] = None
    length_raw: Optional[str] = None
    max_atmosphering_speed: Optional[int] = None
    max_atmosphering_speed_raw: Optional[str] = None
    cargo_capacity: Optional[int] = None
    cargo_capacity_raw: Optional[str] = None
    consumables: str = ""
    crew: Optional[int] = None
    crew_raw: Optional[str] = None
    crew_min: Optional[int] = None
    crew_max: Optional[int] = None
    passengers: Optional[int] = None
    passengers_raw: Optional[str] = None
    passengers_min: Optional[int] = None
    passengers_max: Optional[int] = None
    pilots: List[NamedResourceSummary] = []
    films: List[TitledResourceSummary] = []
    films_count: int = 0
    pilots_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class StarshipFilter(BaseModel):
    name: Optional[str] = None
    manufacturer: Optional[str] = None
    starship_class: Optional[str] = None
