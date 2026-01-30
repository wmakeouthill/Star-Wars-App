from dataclasses import dataclass
from typing import List, Optional


@dataclass(frozen=True)
class Character:
    id: str
    name: str
    height: Optional[int]
    mass: Optional[float]
    hair_color: str
    skin_color: str
    eye_color: str
    birth_year: str
    gender: str
    homeworld_id: str
    film_ids: List[str]
    starship_ids: List[str]
