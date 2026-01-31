import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.application.services.chat_service import ChatService
from app.application.services.gamification_service import GamificationService
from app.domain.schemas.chat import ChatRequest, ChatResponse
from app.domain.schemas.chat_history import (
    ChatConversationCreateRequest,
    ChatConversationSchema,
    ChatMessageSchema,
)
from app.infrastructure.db.session import get_db
from app.infrastructure.db.models.chat import ChatConversation, ChatMessageModel
from app.interfaces.api.v1.dependencies.auth import get_current_user_id
from app.interfaces.api.v1.dependencies.auth import require_authenticated_user_id
from app.interfaces.api.v1.dependencies.services import get_chat_service
from app.interfaces.api.v1.dependencies.services import get_gamification_service

router = APIRouter(prefix="/chat", tags=["Mestre Yoda AI"])

def _try_uuid(value: str | None) -> uuid.UUID | None:
    if not value:
        return None
    try:
        return uuid.UUID(str(value))
    except Exception:
        return None


@router.get("/conversations", response_model=list[ChatConversationSchema])
def list_conversations(
    user_id: str = Depends(require_authenticated_user_id),
    db: Session = Depends(get_db),
):
    user_uuid = uuid.UUID(user_id)
    rows = db.scalars(
        select(ChatConversation).where(ChatConversation.user_id == user_uuid).order_by(ChatConversation.updated_at.desc())
    ).all()
    return [
        ChatConversationSchema(
            id=str(r.id),
            title=r.title,
            persona=r.persona,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in rows
    ]


@router.post("/conversations", response_model=ChatConversationSchema)
def create_conversation(
    payload: ChatConversationCreateRequest,
    user_id: str = Depends(require_authenticated_user_id),
    db: Session = Depends(get_db),
):
    user_uuid = uuid.UUID(user_id)
    conv = ChatConversation(user_id=user_uuid, title=payload.title, persona=payload.persona)
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return ChatConversationSchema(
        id=str(conv.id),
        title=conv.title,
        persona=conv.persona,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
    )


@router.get("/conversations/{conversation_id}/messages", response_model=list[ChatMessageSchema])
def list_messages(
    conversation_id: str,
    user_id: str = Depends(require_authenticated_user_id),
    db: Session = Depends(get_db),
):
    user_uuid = uuid.UUID(user_id)
    conv_uuid = uuid.UUID(conversation_id)
    conv = db.scalar(select(ChatConversation).where(ChatConversation.id == conv_uuid))
    if conv is None or conv.user_id != user_uuid:
        raise HTTPException(status_code=404, detail="Conversa não encontrada.")

    rows = db.scalars(
        select(ChatMessageModel)
        .where(ChatMessageModel.conversation_id == conv_uuid)
        .order_by(ChatMessageModel.created_at.asc())
    ).all()
    return [
        ChatMessageSchema(
            id=str(m.id),
            role="user" if m.role == "user" else "assistant",
            content=m.content,
            created_at=m.created_at,
        )
        for m in rows
    ]


@router.post("/message", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    service: ChatService = Depends(get_chat_service),
    gamification: GamificationService = Depends(get_gamification_service),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    response = await service.process_message(request)
    if response.xp_earned > 0:
        gamification.record_chat_message(user_id, response.xp_earned, db, persona=str(request.persona))

    # Persistência (somente para usuário autenticado UUID)
    user_uuid = _try_uuid(user_id)
    if user_uuid:
        conv_uuid = _try_uuid(request.conversation_id)
        conv: ChatConversation | None = None
        if conv_uuid:
            conv = db.scalar(select(ChatConversation).where(ChatConversation.id == conv_uuid))
            if conv is None or conv.user_id != user_uuid:
                conv = None

        if conv is None:
            title = request.message.strip()[:80] if request.message else None
            conv = ChatConversation(user_id=user_uuid, title=title, persona=str(request.persona))
            db.add(conv)
            db.flush()

        # Mensagem do usuário + resposta do assistente
        db.add(ChatMessageModel(conversation_id=conv.id, role="user", content=request.message.strip()))
        db.add(ChatMessageModel(conversation_id=conv.id, role="assistant", content=response.message))
        db.commit()

        response.conversation_id = str(conv.id)

    return response
