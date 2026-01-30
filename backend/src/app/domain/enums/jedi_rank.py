from __future__ import annotations

from enum import Enum


class JediRank(str, Enum):
    YOUNGLING = "Youngling"
    INITIATE = "Iniciado"
    PADAWAN = "Padawan"
    JEDI_KNIGHT = "Cavaleiro Jedi"
    JEDI_MASTER = "Mestre Jedi"
    COUNCIL_MEMBER = "Membro do Conselho"
    GRAND_MASTER = "Grão-Mestre"

    @classmethod
    def from_xp(cls, xp: int) -> "JediRank":
        thresholds: list[tuple[int, JediRank]] = [
            (0, cls.YOUNGLING),
            (100, cls.INITIATE),
            (300, cls.PADAWAN),
            (700, cls.JEDI_KNIGHT),
            (1500, cls.JEDI_MASTER),
            (3000, cls.COUNCIL_MEMBER),
            (5000, cls.GRAND_MASTER),
        ]
        rank: JediRank = cls.YOUNGLING
        for threshold, r in thresholds:
            if xp >= threshold:
                rank = r
        return rank

