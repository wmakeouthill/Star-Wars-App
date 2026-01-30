from dataclasses import dataclass
from typing import List


@dataclass(frozen=True)
class Film:
    id: str
    title: str
    episode_id: int
    director: str
    producer: str
    release_date: str
    character_ids: List[str]
