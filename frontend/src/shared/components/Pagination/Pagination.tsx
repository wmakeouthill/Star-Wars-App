import { PaginationProps } from './Pagination.types';
import { usePagination } from './Pagination.hooks';
import styles from './Pagination.module.css';

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  const { canGoBack, canGoForward } = usePagination(page, totalPages);

  return (
    <div className={styles.container}>
      <button
        type="button"
        className={styles.button}
        disabled={!canGoBack}
        onClick={() => onPageChange(page - 1)}
      >
        Anterior
      </button>
      <span className={styles.label}>
        Página {page} de {totalPages}
      </span>
      <button
        type="button"
        className={styles.button}
        disabled={!canGoForward}
        onClick={() => onPageChange(page + 1)}
      >
        Próxima
      </button>
    </div>
  );
}
