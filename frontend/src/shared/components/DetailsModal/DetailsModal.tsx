import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './DetailsModal.module.css';

type DetailsModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
};

export function DetailsModal({ open, title, onClose, children, headerActions }: Readonly<DetailsModalProps>) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className={styles.overlay}
      role="button"
      tabIndex={0}
      aria-label="Fechar modal"
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={`Detalhes: ${title}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          <div className={styles.headerActions}>
            {headerActions}
            <button type="button" className={styles.close} onClick={onClose}>
              Fechar
            </button>
          </div>
        </div>
        <div className={styles.content}>{children}</div>
      </div>
    </div>,
    document.body
  );
}

