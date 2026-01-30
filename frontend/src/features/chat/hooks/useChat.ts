import { useEffect, useMemo, useState } from 'react';
import { sendChatMessage } from '../services/chat.service';
import { ChatMessage, ChatPersona } from '../types/chat.types';

const STORAGE_KEY = 'holocron-chat-v1';
const MAX_MESSAGES_PER_PERSONA = 50;

function emptyByPersona<T>(initial: T): Record<ChatPersona, T> {
    return { yoda: initial, vader: initial };
}

function clampMessages(messages: ChatMessage[]): ChatMessage[] {
    if (messages.length <= MAX_MESSAGES_PER_PERSONA) {
        return messages;
    }
    return messages.slice(messages.length - MAX_MESSAGES_PER_PERSONA);
}

export function useChat() {
    const [persona, setPersona] = useState<ChatPersona>('yoda');
    const [messagesByPersona, setMessagesByPersona] = useState<Record<ChatPersona, ChatMessage[]>>(() =>
        emptyByPersona<ChatMessage[]>([])
    );
    const [inputByPersona, setInputByPersona] = useState<Record<ChatPersona, string>>(() =>
        emptyByPersona<string>('')
    );
    const [loadingByPersona, setLoadingByPersona] = useState<Record<ChatPersona, boolean>>(() =>
        emptyByPersona<boolean>(false)
    );
    const [conversationIdByPersona, setConversationIdByPersona] = useState<Record<ChatPersona, string | null>>(() =>
        emptyByPersona<string | null>(null)
    );

    // "Cache" local: re-hidrata histórico (por persona) se existir.
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                return;
            }
            const parsed = JSON.parse(raw) as unknown;
            if (!parsed || typeof parsed !== 'object') {
                return;
            }
            const data = parsed as Partial<{
                messagesByPersona: Record<ChatPersona, ChatMessage[]>;
                persona: ChatPersona;
                conversationIdByPersona: Record<ChatPersona, string | null>;
            }>;

            if (data.messagesByPersona?.yoda && data.messagesByPersona?.vader) {
                setMessagesByPersona({
                    yoda: clampMessages(data.messagesByPersona.yoda),
                    vader: clampMessages(data.messagesByPersona.vader),
                });
            }
            if (data.persona === 'yoda' || data.persona === 'vader') {
                setPersona(data.persona);
            }
            if (data.conversationIdByPersona?.yoda !== undefined && data.conversationIdByPersona?.vader !== undefined) {
                setConversationIdByPersona({
                    yoda: data.conversationIdByPersona.yoda ?? null,
                    vader: data.conversationIdByPersona.vader ?? null,
                });
            }
        } catch {
            // Ignora cache inválido.
        }
    }, []);

    // Persiste histórico (por persona). Não persiste input/loading.
    useEffect(() => {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({
                    persona,
                    messagesByPersona: {
                        yoda: clampMessages(messagesByPersona.yoda),
                        vader: clampMessages(messagesByPersona.vader),
                    },
                    conversationIdByPersona,
                })
            );
        } catch {
            // Se storage estiver indisponível (ex: modo privado), segue sem cache.
        }
    }, [messagesByPersona, persona, conversationIdByPersona]);

    const messages = useMemo(() => messagesByPersona[persona], [messagesByPersona, persona]);
    const input = useMemo(() => inputByPersona[persona], [inputByPersona, persona]);
    const isLoading = useMemo(() => loadingByPersona[persona], [loadingByPersona, persona]);

    const setInput = (value: string) => {
        setInputByPersona((prev) => ({ ...prev, [persona]: value }));
    };

    const clearHistory = (targetPersona: ChatPersona = persona) => {
        setMessagesByPersona((prev) => ({ ...prev, [targetPersona]: [] }));
        setInputByPersona((prev) => ({ ...prev, [targetPersona]: '' }));
        setLoadingByPersona((prev) => ({ ...prev, [targetPersona]: false }));
        setConversationIdByPersona((prev) => ({ ...prev, [targetPersona]: null }));
    };

    const sendMessage = async () => {
        const currentPersona = persona;
        const currentInput = inputByPersona[currentPersona];
        const trimmed = currentInput.trim();
        if (!trimmed) {
            return;
        }

        const currentMessages = messagesByPersona[currentPersona];
        const userMessage: ChatMessage = { role: 'user', content: trimmed };
        const nextMessages: ChatMessage[] = [...currentMessages, userMessage];
        setMessagesByPersona((prev) => ({ ...prev, [currentPersona]: nextMessages }));
        setInputByPersona((prev) => ({ ...prev, [currentPersona]: '' }));
        setLoadingByPersona((prev) => ({ ...prev, [currentPersona]: true }));

        try {
            const response = await sendChatMessage({
                message: trimmed,
                context: nextMessages,
                persona: currentPersona,
                conversation_id: conversationIdByPersona[currentPersona] ?? undefined,
            });
            setMessagesByPersona((prev) => ({
                ...prev,
                [currentPersona]: [...nextMessages, { role: 'assistant', content: response.message }],
            }));
            if (response.conversation_id) {
                setConversationIdByPersona((prev) => ({ ...prev, [currentPersona]: response.conversation_id ?? null }));
            }
        } finally {
            setLoadingByPersona((prev) => ({ ...prev, [currentPersona]: false }));
        }
    };

    return {
        messages,
        input,
        setInput,
        sendMessage,
        isLoading,
        persona,
        setPersona,
        clearHistory,
    };
}
