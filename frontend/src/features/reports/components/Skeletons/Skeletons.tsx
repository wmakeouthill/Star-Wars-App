import styles from './Skeletons.module.css';

export function ChartSkeleton({ height = 280 }: Readonly<{ height?: number }>) {
  return (
    <div className={styles.chartSkeleton} style={{ height }}>
      <div className={styles.shimmer} />
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div className={styles.statSkeleton}>
      <div className={styles.shimmer} />
    </div>
  );
}

export function PanelSkeleton({ rows = 3 }: Readonly<{ rows?: number }>) {
  return (
    <div className={styles.panelSkeleton}>
      <div className={styles.panelSkeletonHeader}>
        <div className={styles.shimmer} />
      </div>
      <div className={styles.panelSkeletonBody}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className={styles.panelSkeletonRow}>
            <div className={styles.shimmer} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function KpiSkeleton() {
  return (
    <div className={styles.kpiSkeleton}>
      <div className={styles.shimmer} />
    </div>
  );
}
