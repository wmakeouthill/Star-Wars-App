from __future__ import annotations

from typing import Any, List, Literal, Optional
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str = Field(..., description="user | assistant")
    content: str


class ChatRequest(BaseModel):
    message: str
    context: List[ChatMessage] = Field(default_factory=list)
    persona: Literal["yoda", "vader"] = Field(default="yoda", description="Persona do chat (yoda | vader)")
    conversation_id: Optional[str] = Field(default=None, description="ID da conversa (UUID)")


class ChatResponse(BaseModel):
    message: str
    data: Optional[dict[str, Any]] = None
    suggested_actions: List[str] = Field(default_factory=list)
    xp_earned: int = 0
    conversation_id: Optional[str] = None
