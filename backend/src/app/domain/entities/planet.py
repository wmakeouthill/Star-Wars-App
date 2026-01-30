from dataclasses import dataclass
from typing import List, Optional


@dataclass(frozen=True)
class Planet:
    id: str
    name: str
    climate: str
    terrain: str
    population: Optional[int]
    film_ids: List[str]
