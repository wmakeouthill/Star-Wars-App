import { useMemo, useState } from 'react';
import { StarshipCard } from '../../components/StarshipCard';
import { DetailsModal, Pagination, CustomSelect, FilmFilter } from '@/shared/components';
import { useStarshipManufacturerOptions, useStarshipClassOptions } from '@/shared/hooks/useMetadataOptions';
import { useStarshipsPage } from './StarshipsPage.hooks';
import styles from './StarshipsPage.module.css';

export function StarshipsPage() {
  const {
    name,
    manufacturer,
    starshipClass,
    filmId,
    sortBy,
    sortOrder,
    page,
    selectedStarshipId,
    setName,
    setManufacturer,
    setStarshipClass,
    setFilmId,
    setSortBy,
    setSortOrder,
    setPage,
    setSelectedStarshipId,
    query,
    starshipDetailsQuery,
  } = useStarshipsPage();

  const [detailsTitle, setDetailsTitle] = useState('');
  const { options: manufacturerOptions } = useStarshipManufacturerOptions();
  const { options: classOptions } = useStarshipClassOptions();

  const summaryStarship = useMemo(() => {
    if (!selectedStarshipId) return null;
    return query.data?.items.find((s) => s.id === selectedStarshipId) ?? null;
  }, [query.data?.items, selectedStarshipId]);

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
          value={manufacturer}
          onChange={(value) => setManufacturer(value as string)}
          options={manufacturerOptions}
          placeholder="Filtrar por fabricante"
          className={styles.input}
        />

        <CustomSelect
          value={starshipClass}
          onChange={(value) => setStarshipClass(value as string)}
          options={classOptions}
          placeholder="Filtrar por classe"
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
            { value: 'crew', label: 'Ordenar por tripulação' },
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

      {query.isLoading && <p className={styles.status}>Carregando naves...</p>}
      {query.isError && <p className={styles.status}>Erro ao carregar naves.</p>}

      <div className={styles.grid}>
        {query.data?.items.map((starship) => (
          <StarshipCard
            key={starship.id}
            starship={starship}
            variant="compact"
            onViewDetails={() => {
              setSelectedStarshipId(starship.id);
              setDetailsTitle(starship.name);
            }}
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
        open={!!selectedStarshipId}
        title={detailsTitle || summaryStarship?.name || 'Nave'}
        onClose={() => {
          setSelectedStarshipId(null);
          setDetailsTitle('');
        }}
      >
        {starshipDetailsQuery.isLoading && (
          <p className={styles.status}>Carregando detalhes da nave...</p>
        )}
        {starshipDetailsQuery.isError && (
          <p className={styles.status}>Erro ao carregar detalhes da nave.</p>
        )}

        {(starshipDetailsQuery.data || summaryStarship) && (
          <>
            <StarshipCard starship={starshipDetailsQuery.data ?? summaryStarship!} />
            {starshipDetailsQuery.data && (
              <>
                <p className={styles.status}>
                  <strong>Pilotos:</strong>{' '}
                  {(starshipDetailsQuery.data.pilots ?? []).map((p) => p.name).join(', ') || '—'}
                </p>
                <p className={styles.status}>
                  <strong>Filmes:</strong>{' '}
                  {(starshipDetailsQuery.data.films ?? []).map((f) => f.title).join(', ') || '—'}
                </p>
              </>
            )}
          </>
        )}
      </DetailsModal>
    </section>
  );
}
