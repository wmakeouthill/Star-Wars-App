from dataclasses import dataclass
from typing import List, Optional


@dataclass(frozen=True)
class Starship:
    id: str
    name: str
    model: str
    manufacturer: str
    starship_class: str
    crew: Optional[int]
    passengers: Optional[int]
    film_ids: List[str]
