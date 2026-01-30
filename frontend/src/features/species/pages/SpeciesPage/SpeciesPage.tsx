import { SpeciesCard } from '../../components/SpeciesCard/SpeciesCard';
import { Pagination } from '@/shared/components';
import { useSpeciesPage } from './SpeciesPage.hooks';
import styles from './SpeciesPage.module.css';

export function SpeciesPage() {
  const {
    name,
    classification,
    language,
    sortBy,
    sortOrder,
    page,
    setName,
    setClassification,
    setLanguage,
    setSortBy,
    setSortOrder,
    setPage,
    query,
  } = useSpeciesPage();

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
          placeholder="Filtrar por classificação"
          value={classification}
          onChange={(event) => setClassification(event.target.value)}
        />
        <input
          className={styles.input}
          placeholder="Filtrar por idioma"
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
        />
        <select
          className={styles.input}
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
        >
          <option value="name">Ordenar por nome</option>
          <option value="average_height">Ordenar por altura média</option>
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

      {query.isLoading && <p className={styles.status}>Carregando espécies...</p>}
      {query.isError && <p className={styles.status}>Erro ao carregar espécies.</p>}

      <div className={styles.grid}>
        {query.data?.items.map((species) => (
          <SpeciesCard key={species.id} species={species} />
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

