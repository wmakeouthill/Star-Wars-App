from __future__ import annotations

from pydantic import BaseModel


class NamedResourceSummary(BaseModel):
    id: str
    name: str


class TitledResourceSummary(BaseModel):
    id: str
    title: str

