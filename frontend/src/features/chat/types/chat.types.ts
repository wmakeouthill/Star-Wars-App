export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export type ChatPersona = 'yoda' | 'vader';

export interface ChatRequest {
    message: string;
    context: ChatMessage[];
    persona?: ChatPersona;
    conversation_id?: string;
}

export interface ChatResponse {
    message: string;
    data?: Record<string, unknown>;
    suggested_actions?: string[];
    xp_earned?: number;
    conversation_id?: string;
}

export interface ChatConversation {
    id: string;
    title: string | null;
    persona: ChatPersona;
    created_at: string;
    updated_at: string;
}

export interface ChatMessageWithMeta {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
}
