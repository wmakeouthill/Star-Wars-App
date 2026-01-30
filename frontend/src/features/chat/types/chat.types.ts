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
