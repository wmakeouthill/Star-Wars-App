import { useMemo, useState } from 'react';
import { PlanetCard } from '../../components/PlanetCard';
import { DetailsModal, Pagination, CustomSelect, FilmFilter } from '@/shared/components';
import { useClimateOptions, useTerrainOptions } from '@/shared/hooks/useMetadataOptions';
import { usePlanetsPage } from './PlanetsPage.hooks';
import styles from './PlanetsPage.module.css';

export function PlanetsPage() {
  const {
    name,
    climate,
    terrain,
    filmId,
    sortBy,
    sortOrder,
    page,
    selectedPlanetId,
    setName,
    setClimate,
    setTerrain,
    setFilmId,
    setSortBy,
    setSortOrder,
    setPage,
    setSelectedPlanetId,
    query,
    planetDetailsQuery,
  } = usePlanetsPage();

  const [detailsTitle, setDetailsTitle] = useState('');
  const { options: climateOptions } = useClimateOptions();
  const { options: terrainOptions } = useTerrainOptions();

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
        
        <CustomSelect
          value={climate}
          onChange={(value) => setClimate(value as string)}
          options={[{ value: '', label: 'Todos os climas' }, ...climateOptions]}
          placeholder="Filtrar por clima"
          className={styles.input}
        />

        <CustomSelect
          value={terrain}
          onChange={(value) => setTerrain(value as string)}
          options={[{ value: '', label: 'Todos os terrenos' }, ...terrainOptions]}
          placeholder="Filtrar por terreno"
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
            { value: 'population', label: 'Ordenar por população' },
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
