from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class ChatConversationCreateRequest(BaseModel):
    title: Optional[str] = Field(default=None, max_length=200)
    persona: Literal["yoda", "vader"] = Field(default="yoda")


class ChatConversationSchema(BaseModel):
    id: str
    title: Optional[str] = None
    persona: str
    created_at: datetime
    updated_at: datetime


class ChatMessageSchema(BaseModel):
    id: str
    role: Literal["user", "assistant"]
    content: str
    created_at: datetime

