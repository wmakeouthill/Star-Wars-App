import { useEffect, useRef, useState } from 'react';
import { useChatContext } from '../../context';
import type { ChatPersona } from '../../types/chat.types';
import { ChatPanel } from '../ChatPanel';
import yodaAvatar from '@/shared/images/yoda-espada-verde.png';
import vaderAvatar from '@/shared/images/darth-vader-chat.png';
import styles from './YodaChatBubble.module.css';

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function getPersonaUi(persona: ChatPersona) {
  const isYoda = persona === 'yoda';
  const currentLabel = isYoda ? 'Yoda' : 'Vader';
  const nextLabel = isYoda ? 'Vader' : 'Yoda';
  return {
    isYoda,
    avatar: isYoda ? yodaAvatar : vaderAvatar,
    title: isYoda ? 'Mestre Yoda' : 'Darth Vader',
    subtitle: isYoda
      ? '"Perguntas sobre a galáxia, você tem?"'
      : '"Não subestime o poder do lado sombrio."',
    placeholder: isYoda ? 'Pergunte ao Mestre Yoda...' : 'Fale com Darth Vader...',
    fabAriaLabel: isYoda ? 'Abrir chat com o Mestre Yoda' : 'Abrir chat com Darth Vader',
    fabTitle: isYoda ? 'Falar com o Yoda' : 'Falar com Darth Vader',
    dialogAriaLabel: isYoda ? 'Chat com o Mestre Yoda' : 'Chat com Darth Vader',
    toggleAriaLabel: isYoda ? 'Trocar para Darth Vader' : 'Trocar para Mestre Yoda',
    toggleTitle: isYoda ? 'Trocar para Darth Vader' : 'Trocar para Mestre Yoda',
    toggleLabel: nextLabel,
    quickToggleLabel: currentLabel,
    quickToggleAriaLabel: `Personagem atual: ${currentLabel}. Clique para trocar para ${nextLabel}.`,
    quickToggleTitle: `Atual: ${currentLabel} (trocar para ${nextLabel})`,
  };
}

export function YodaChatBubble() {
  const {
    messages,
    input,
    setInput,
    sendMessage,
    isLoading,
    persona,
    setPersona,
    conversations,
    isLoadingConversations,
    showHistory,
    toggleHistory,
    loadConversation,
    startNewChat,
  } = useChatContext();
  const [isOpen, setIsOpen] = useState(false);
  const windowRef = useRef<HTMLDialogElement | null>(null);
  const ui = getPersonaUi(persona);

  // Filtra conversas pela persona atual
  const filteredConversations = conversations.filter((c) => c.persona === persona);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const t = window.setTimeout(() => {
      const inputEl = windowRef.current?.querySelector('input');
      inputEl?.focus();
    }, 0);

    return () => window.clearTimeout(t);
  }, [isOpen]);

  // Efeito para ajustar a posição quando o teclado virtual abre/fecha no mobile
  useEffect(() => {
    if (!isOpen || !windowRef.current) {
      return;
    }

    const dialog = windowRef.current;

    const handleViewportResize = () => {
      if (!window.visualViewport) return;
      
      const viewport = window.visualViewport;
      const offsetY = window.innerHeight - viewport.height;
      
      // Aplica transform para subir o conteúdo quando o teclado abre
      if (offsetY > 50) {
        // Teclado aberto
        dialog.style.height = `${viewport.height}px`;
        dialog.style.transform = `translateY(${viewport.offsetTop}px)`;
      } else {
        // Teclado fechado
        dialog.style.height = '';
        dialog.style.transform = '';
      }
    };

    const visualViewport = window.visualViewport;
    if (visualViewport) {
      visualViewport.addEventListener('resize', handleViewportResize);
      visualViewport.addEventListener('scroll', handleViewportResize);
    }

    return () => {
      if (visualViewport) {
        visualViewport.removeEventListener('resize', handleViewportResize);
        visualViewport.removeEventListener('scroll', handleViewportResize);
      }
      // Limpa estilos ao fechar
      dialog.style.height = '';
      dialog.style.transform = '';
    };
  }, [isOpen]);

  // Classe condicional para fullscreen no mobile quando aberto
  const rootClassName = [styles.root, isOpen ? styles.rootOpen : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClassName} aria-live="polite">
      {isOpen && (
        <button
          type="button"
          className={styles.backdrop}
          aria-label="Fechar chat"
          onClick={() => setIsOpen(false)}
        />
      )}

      {!isOpen ? (
        <div className={styles.launcher}>
          <button
            type="button"
            className={styles.quickToggle}
            onClick={() => setPersona((prev) => (prev === 'yoda' ? 'vader' : 'yoda'))}
            aria-label={ui.quickToggleAriaLabel}
            title={ui.quickToggleTitle}
          >
            {ui.quickToggleLabel}
          </button>
          <button
            type="button"
            className={styles.fab}
            onClick={() => setIsOpen(true)}
            aria-label={ui.fabAriaLabel}
            title={ui.fabTitle}
          >
            <img className={styles.fabAvatar} src={ui.avatar} alt="" />
            <span className={styles.fabPulse} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <dialog
          open
          ref={windowRef}
          className={styles.window}
          aria-label={ui.dialogAriaLabel}
        >
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <img className={styles.avatar} src={ui.avatar} alt="" />
              <div className={styles.headerText}>
                <div className={styles.title}>{ui.title}</div>
                <div className={styles.subtitle}>{ui.subtitle}</div>
              </div>
            </div>
            <div className={styles.headerActions}>
              <button
                type="button"
                className={styles.switcher}
                onClick={() => setPersona((prev) => (prev === 'yoda' ? 'vader' : 'yoda'))}
                aria-label={ui.toggleAriaLabel}
                title={ui.toggleTitle}
              >
                {ui.toggleLabel}
              </button>
              <button
                type="button"
                className={`${styles.historyBtn} ${showHistory ? styles.historyBtnActive : ''}`}
                onClick={toggleHistory}
                disabled={isLoading}
                aria-label="Ver histórico de conversas"
                title="Histórico de conversas"
              >
                Histórico
              </button>
              <button
                type="button"
                className={styles.close}
                onClick={() => setIsOpen(false)}
                aria-label="Minimizar chat"
                title="Minimizar"
              >
                ×
              </button>
            </div>
          </div>

          <div className={styles.body}>
            {showHistory ? (
              <div className={styles.historyPanel}>
                <div className={styles.historyHeader}>
                  <span className={styles.historyTitle}>Conversas salvas</span>
                </div>
                {isLoadingConversations ? (
                  <div className={styles.historyLoading}>Carregando...</div>
                ) : filteredConversations.length === 0 ? (
                  <div className={styles.historyEmpty}>
                    Nenhuma conversa salva ainda.
                    <br />
                    <small>Suas conversas são salvas automaticamente quando você está logado.</small>
                  </div>
                ) : (
                  <ul className={styles.historyList}>
                    {filteredConversations.map((conv) => (
                      <li key={conv.id}>
                        <button
                          type="button"
                          className={styles.historyItem}
                          onClick={() => loadConversation(conv.id, conv.persona)}
                        >
                          <span className={styles.historyItemTitle}>
                            {conv.title || 'Conversa sem título'}
                          </span>
                          <span className={styles.historyItemMeta}>
                            <span className={styles.historyItemPersona}>
                              {conv.persona === 'yoda' ? '🟢 Yoda' : '🔴 Vader'}
                            </span>
                            <span className={styles.historyItemDate}>
                              {formatDate(conv.updated_at)}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <ChatPanel
                variant="bubble"
                messages={messages}
                input={input}
                isLoading={isLoading}
                onInputChange={setInput}
                onSend={sendMessage}
                placeholder={ui.placeholder}
              />
            )}
          </div>

          <div className={styles.footer}>
            <div className={styles.footerHint}>
              Dica: use <span className={styles.keycap}>ESC</span> pra fechar.
            </div>
            <div className={styles.footerRight}>
              <div className={styles.footerCount}>
                <span className={styles.footerCountLabel}>Msgs</span>
                <span className={styles.footerCountValue}>{messages.length}</span>
              </div>
              <button
                type="button"
                className={styles.newChatBtn}
                onClick={startNewChat}
                disabled={isLoading || messages.length === 0}
                aria-label="Iniciar novo chat"
                title="Novo chat"
              >
                + Novo
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}

