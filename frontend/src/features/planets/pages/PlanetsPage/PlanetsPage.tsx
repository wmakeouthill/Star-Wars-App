import { useMemo, useState } from 'react';
import { PlanetCard } from '../../components/PlanetCard';
import { DetailsModal, Pagination } from '@/shared/components';
import { usePlanetsPage } from './PlanetsPage.hooks';
import styles from './PlanetsPage.module.css';

export function PlanetsPage() {
  const {
    name,
    climate,
    sortBy,
    sortOrder,
    page,
    selectedPlanetId,
    setName,
    setClimate,
    setSortBy,
    setSortOrder,
    setPage,
    setSelectedPlanetId,
    query,
    planetDetailsQuery,
  } = usePlanetsPage();

  const [detailsTitle, setDetailsTitle] = useState('');

  const summaryPlanet = useMemo(() => {
    if (!selectedPlanetId) return null;
    return query.data?.items.find((p) => p.id === selectedPlanetId) ?? null;
  }, [query.data?.items, selectedPlanetId]);

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
          <PlanetCard
            key={planet.id}
            planet={planet}
            variant="compact"
            onViewDetails={() => {
              setSelectedPlanetId(planet.id);
              setDetailsTitle(planet.name);
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
        open={!!selectedPlanetId}
        title={detailsTitle || summaryPlanet?.name || 'Planeta'}
        onClose={() => {
          setSelectedPlanetId(null);
          setDetailsTitle('');
        }}
      >
        {planetDetailsQuery.isLoading && <p className={styles.status}>Carregando detalhes do planeta...</p>}
        {planetDetailsQuery.isError && (
          <p className={styles.status}>Erro ao carregar detalhes do planeta.</p>
        )}

        {(planetDetailsQuery.data || summaryPlanet) && (
          <>
            <PlanetCard planet={planetDetailsQuery.data ?? summaryPlanet!} />
            {planetDetailsQuery.data && (
              <>
                <p className={styles.status}>
                  <strong>Residentes:</strong>{' '}
                  {(planetDetailsQuery.data.residents ?? []).map((r) => r.name).join(', ') || '—'}
                </p>
                <p className={styles.status}>
                  <strong>Filmes:</strong>{' '}
                  {(planetDetailsQuery.data.films_detail ?? []).map((f) => f.title).join(', ') || '—'}
                </p>
              </>
            )}
          </>
        )}
      </DetailsModal>
    </section>
  );
}
