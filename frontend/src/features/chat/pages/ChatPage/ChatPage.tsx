import { ChatPanel } from '../../components/ChatPanel';
import { useChatPage } from './ChatPage.hooks';
import styles from './ChatPage.module.css';

export function ChatPage() {
  const { messages, input, setInput, sendMessage, isLoading, persona, setPersona, clearHistory } =
    useChatPage();
  const isYoda = persona === 'yoda';

  return (
    <section className={styles.container}>
      <div className={styles.headerRow}>
        <p className={styles.subtitle}>
          {isYoda
            ? 'Converse com o Mestre Yoda e descubra segredos da galáxia.'
            : 'Converse com Darth Vader e encare o lado sombrio.'}
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.personaToggle}
            onClick={() => setPersona((prev) => (prev === 'yoda' ? 'vader' : 'yoda'))}
            aria-label={isYoda ? 'Trocar para Darth Vader' : 'Trocar para Mestre Yoda'}
            title={isYoda ? 'Trocar para Darth Vader' : 'Trocar para Mestre Yoda'}
          >
            {isYoda ? 'Vader' : 'Yoda'}
          </button>
          <button
            type="button"
            className={styles.clear}
            onClick={() => clearHistory()}
            disabled={isLoading}
            aria-label="Limpar histórico deste personagem"
            title="Limpar histórico"
          >
            Limpar
          </button>
        </div>
      </div>
      <ChatPanel
        messages={messages}
        input={input}
        isLoading={isLoading}
        onInputChange={setInput}
        onSend={sendMessage}
        placeholder={isYoda ? 'Pergunte ao Mestre Yoda...' : 'Fale com Darth Vader...'}
      />
    </section>
  );
}
