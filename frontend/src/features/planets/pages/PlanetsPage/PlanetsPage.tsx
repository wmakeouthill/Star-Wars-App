import { PlanetCard } from '../../components/PlanetCard';
import { Pagination } from '@/shared/components';
import { usePlanetsPage } from './PlanetsPage.hooks';
import styles from './PlanetsPage.module.css';

export function PlanetsPage() {
  const {
    name,
    climate,
    sortBy,
    sortOrder,
    page,
    setName,
    setClimate,
    setSortBy,
    setSortOrder,
    setPage,
    query,
  } = usePlanetsPage();

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
          placeholder="Filtrar por clima"
          value={climate}
          onChange={(event) => setClimate(event.target.value)}
        />
        <select
          className={styles.input}
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
        >
          <option value="name">Ordenar por nome</option>
          <option value="population">Ordenar por população</option>
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

      {query.isLoading && <p className={styles.status}>Carregando planetas...</p>}
      {query.isError && <p className={styles.status}>Erro ao carregar planetas.</p>}

      <div className={styles.grid}>
        {query.data?.items.map((planet) => (
          <PlanetCard key={planet.id} planet={planet} />
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
