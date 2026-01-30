import { useMemo, useState } from 'react';
import { SpeciesCard } from '../../components/SpeciesCard/SpeciesCard';
import { DetailsModal, Pagination } from '@/shared/components';
import { useSpeciesDetails } from '../../hooks/useSpeciesDetails';
import type { Species } from '../../types/species.types';
import { useSpeciesPage } from './SpeciesPage.hooks';
import styles from './SpeciesPage.module.css';

export function SpeciesPage() {
  const [details, setDetails] = useState<{ id: string; title: string; data: Species } | null>(null);
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

  const speciesDetailsQuery = useSpeciesDetails(details?.id ?? null);

  const modalSpecies = useMemo(() => {
    if (!details) return null;
    return speciesDetailsQuery.data ?? details.data;
  }, [details, speciesDetailsQuery.data]);

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
          <SpeciesCard
            key={species.id}
            species={species}
            variant="compact"
            onViewDetails={() => setDetails({ id: species.id, title: species.name, data: species })}
          />
        ))}
      </div>

      {query.data?.meta && (
        <Pagination
          page={page}
          totalPages={query.data.meta.total_pages}
          onPageChange={setPage}
        />
      )}

      <DetailsModal
        open={!!details}
        title={details?.title ?? ''}
        onClose={() => setDetails(null)}
      >
        {speciesDetailsQuery.isLoading && <p className={styles.status}>Carregando detalhes...</p>}
        {speciesDetailsQuery.isError && (
          <p className={styles.status}>Erro ao carregar detalhes da espécie.</p>
        )}
        {modalSpecies && <SpeciesCard species={modalSpecies} />}
      </DetailsModal>
    </section>
  );
}

