import { ReportPanelProps } from './ReportPanel.types';
import styles from './ReportPanel.module.css';

export function ReportPanel({ title, subtitle, rightSlot, children }: Readonly<ReportPanelProps>) {
  return (
    <section className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h2 className={styles.title}>{title}</h2>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        {rightSlot && <div className={styles.rightSlot}>{rightSlot}</div>}
      </header>
      <div className={styles.body}>{children}</div>
    </section>
  );
}

