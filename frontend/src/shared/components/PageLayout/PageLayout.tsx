import { usePageLayout } from './PageLayout.hooks';
import { PageLayoutProps } from './PageLayout.types';
import styles from './PageLayout.module.css';

export function PageLayout({ title, subtitle, right, children }: Readonly<PageLayoutProps>) {
  usePageLayout();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className={styles.title}>{title}</h1>
          {right && <div className={styles.headerRight}>{right}</div>}
        </div>
        {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
      </header>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
