import { useMemo, useState } from 'react';
import { SpeciesCard } from '../../components/SpeciesCard/SpeciesCard';
import { DetailsModal, Pagination, CustomSelect, FilmFilter } from '@/shared/components';
import { useClassificationOptions, useLanguageOptions } from '@/shared/hooks/useMetadataOptions';
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
    filmId,
    sortBy,
    sortOrder,
    page,
    setName,
    setClassification,
    setLanguage,
    setFilmId,
    setSortBy,
    setSortOrder,
    setPage,
    query,
  } = useSpeciesPage();

  const speciesDetailsQuery = useSpeciesDetails(details?.id ?? null);
  const { options: classificationOptions } = useClassificationOptions();
  const { options: languageOptions } = useLanguageOptions();

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
        
        <CustomSelect
          value={classification}
          onChange={(value) => setClassification(value as string)}
          options={classificationOptions}
          placeholder="Filtrar por classificação"
          className={styles.input}
        />

        <CustomSelect
          value={language}
          onChange={(value) => setLanguage(value as string)}
          options={languageOptions}
          placeholder="Filtrar por idioma"
          className={styles.input}
        />

        <FilmFilter
          value={filmId}
          onChange={setFilmId}
          className={styles.input}
        />

        <CustomSelect
          value={sortBy}
          onChange={(value) => setSortBy(value as typeof sortBy)}
          options={[
            { value: 'name', label: 'Ordenar por nome' },
            { value: 'average_height', label: 'Ordenar por altura média' },
          ]}
          placeholder="Ordenar por"
        />
        <CustomSelect
          value={sortOrder}
          onChange={(value) => setSortOrder(value as typeof sortOrder)}
          options={[
            { value: 'asc', label: 'Ascendente' },
            { value: 'desc', label: 'Descendente' },
          ]}
          placeholder="Ordem"
        />
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

