import { useEffect, useMemo, useRef } from 'react';
import { ChatPanelProps } from './ChatPanel.types';
import styles from './ChatPanel.module.css';

export function ChatPanel(props: Readonly<ChatPanelProps>) {
  const {
    messages,
    input,
    isLoading,
    onInputChange,
    onSend,
    variant = 'default',
    placeholder = 'Pergunte ao Mestre Yoda...',
    className,
  } = props;

  const panelClassName = [
    styles.panel,
    variant === 'bubble' ? styles.panelBubble : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const messagesClassName = [
    styles.messages,
    variant === 'bubble' ? styles.messagesBubble : '',
  ]
    .filter(Boolean)
    .join(' ');

  const controlsClassName = [
    styles.controls,
    variant === 'bubble' ? styles.controlsBubble : '',
  ]
    .filter(Boolean)
    .join(' ');

  const inputClassName = [styles.input, variant === 'bubble' ? styles.inputBubble : '']
    .filter(Boolean)
    .join(' ');

  const buttonClassName = [styles.button, variant === 'bubble' ? styles.buttonBubble : '']
    .filter(Boolean)
    .join(' ');

  const messagesRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const lastMessageKey = useMemo(() => {
    const last = messages[messages.length - 1];
    return last ? `${last.role}:${last.content}` : '';
  }, [messages]);

  useEffect(() => {
    // Mantém o comportamento esperado de chat: última mensagem sempre visível.
    // Use scrollIntoView para evitar “pulos” estranhos do layout.
    const t = window.setTimeout(() => {
      bottomRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
    }, 0);
    return () => window.clearTimeout(t);
  }, [lastMessageKey, isLoading]);

  return (
    <div className={panelClassName}>
      <div ref={messagesRef} className={messagesClassName}>
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={message.role === 'user' ? styles.messageUser : styles.messageAssistant}
          >
            {message.content}
          </div>
        ))}
        {isLoading && <div className={styles.messageAssistant}>Pensando...</div>}
        <div ref={bottomRef} />
      </div>
      <div className={controlsClassName}>
        <input
          className={inputClassName}
          placeholder={placeholder}
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              if (!isLoading) {
                onSend();
              }
            }
          }}
        />
        <button className={buttonClassName} type="button" onClick={onSend} disabled={isLoading}>
          Enviar
        </button>
      </div>
    </div>
  );
}
