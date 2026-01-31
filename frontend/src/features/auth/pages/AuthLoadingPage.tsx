import styles from './AuthLoadingPage.module.css';

export function AuthLoadingPage() {
  return (
    <div className={styles.container}>
      <div className={styles.panel}>
        <div className={styles.title}>Holocron Analytics</div>
        <div className={styles.subtitle}>Verificando sua sessão…</div>
        <output className={styles.spinner} aria-label="Carregando" aria-live="polite" />
        <div className={styles.hint}>Se você já fez login antes, isso leva só um instante.</div>
      </div>
    </div>
  );
}

