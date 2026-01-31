import { apiGet, apiPost } from '@/shared/services/api';
import { ChatConversation, ChatMessageWithMeta, ChatRequest, ChatResponse } from '../types/chat.types';

export async function sendChatMessage(payload: ChatRequest) {
    return apiPost<ChatResponse>('/api/v1/chat/message', payload);
}

export async function listConversations() {
    return apiGet<ChatConversation[]>('/api/v1/chat/conversations');
}

export async function getConversationMessages(conversationId: string) {
    return apiGet<ChatMessageWithMeta[]>(`/api/v1/chat/conversations/${conversationId}/messages`);
}
