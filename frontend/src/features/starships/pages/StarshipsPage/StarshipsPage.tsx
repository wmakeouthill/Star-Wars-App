import { StarshipCard } from '../../components/StarshipCard';
import { Pagination } from '@/shared/components';
import { useStarshipsPage } from './StarshipsPage.hooks';
import styles from './StarshipsPage.module.css';

export function StarshipsPage() {
  const {
    name,
    manufacturer,
    sortBy,
    sortOrder,
    page,
    setName,
    setManufacturer,
    setSortBy,
    setSortOrder,
    setPage,
    query,
  } = useStarshipsPage();

  return (
    <section>
      <div className={styles.filters}>
        <input
          className={styles.input}
          placeholder="Filtrar por nome"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <input
          className={styles.input}
          placeholder="Filtrar por fabricante"
          value={manufacturer}
          onChange={(event) => setManufacturer(event.target.value)}
        />
        <select
          className={styles.input}
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
        >
          <option value="name">Ordenar por nome</option>
          <option value="crew">Ordenar por tripulação</option>
        </select>
        <select
          className={styles.input}
          value={sortOrder}
          onChange={(event) => setSortOrder(event.target.value as typeof sortOrder)}
        >
          <option value="asc">Ascendente</option>
          <option value="desc">Descendente</option>
        </select>
      </div>

      {query.isLoading && <p className={styles.status}>Carregando naves...</p>}
      {query.isError && <p className={styles.status}>Erro ao carregar naves.</p>}

      <div className={styles.grid}>
        {query.data?.items.map((starship) => (
          <StarshipCard key={starship.id} starship={starship} />
        ))}
      </div>

      {query.data?.meta && (
        <Pagination
          page={page}
          totalPages={query.data.meta.total_pages}
          onPageChange={setPage}
        />
      )}
    </section>
  );
}
