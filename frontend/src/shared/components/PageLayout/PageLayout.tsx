import { usePageLayout } from './PageLayout.hooks';
import { PageLayoutProps } from './PageLayout.types';
import styles from './PageLayout.module.css';

export function PageLayout({ title, subtitle, right, children }: Readonly<PageLayoutProps>) {
  usePageLayout();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>{title}</h1>
            {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
          </div>
          {right && <div className={styles.headerRight}>{right}</div>}
        </div>
      </header>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
