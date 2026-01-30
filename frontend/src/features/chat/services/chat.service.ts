import { apiPost } from '@/shared/services/api';
import { ChatRequest, ChatResponse } from '../types/chat.types';

export async function sendChatMessage(payload: ChatRequest) {
    return apiPost<ChatResponse>('/api/v1/chat/message', payload);
}
