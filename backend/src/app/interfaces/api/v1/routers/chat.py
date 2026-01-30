from fastapi import APIRouter, Depends

from app.application.services.chat_service import ChatService
from app.application.services.gamification_service import GamificationService
from app.domain.schemas.chat import ChatRequest, ChatResponse
from app.interfaces.api.v1.dependencies.auth import get_current_user_id
from app.interfaces.api.v1.dependencies.services import get_chat_service
from app.interfaces.api.v1.dependencies.services import get_gamification_service

router = APIRouter(prefix="/chat", tags=["Mestre Yoda AI"])


@router.post("/message", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    service: ChatService = Depends(get_chat_service),
    gamification: GamificationService = Depends(get_gamification_service),
    user_id: str = Depends(get_current_user_id),
):
    response = await service.process_message(request)
    if response.xp_earned > 0:
        gamification.record_chat_message(user_id, response.xp_earned)
    return response
