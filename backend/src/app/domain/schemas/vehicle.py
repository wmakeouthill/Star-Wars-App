from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, ConfigDict


class VehicleResponse(BaseModel):
    id: str
    name: str
    image_url: Optional[str] = None
    model: str
    manufacturer: str
    vehicle_class: str
    crew: Optional[int] = None
    crew_raw: Optional[str] = None
    crew_min: Optional[int] = None
    crew_max: Optional[int] = None
    passengers: Optional[int] = None
    passengers_raw: Optional[str] = None
    passengers_min: Optional[int] = None
    passengers_max: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class VehicleFilter(BaseModel):
    name: Optional[str] = None
    manufacturer: Optional[str] = None
    vehicle_class: Optional[str] = None

