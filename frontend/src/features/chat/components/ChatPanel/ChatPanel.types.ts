import { ChatMessage } from '../../types/chat.types';

export interface ChatPanelProps {
    messages: ChatMessage[];
    input: string;
    isLoading: boolean;
    onInputChange: (value: string) => void;
    onSend: () => void;
    variant?: 'default' | 'bubble';
    placeholder?: string;
    className?: string;
}
