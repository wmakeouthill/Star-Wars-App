import { useMemo, useState } from 'react';
import { FilmCard } from '../../components/FilmCard';
import { CharacterCard } from '@/features/characters/components/CharacterCard';
import { DetailsModal, Pagination, CustomSelect } from '@/shared/components';
import { useDirectorOptions } from '@/shared/hooks/useMetadataOptions';
import { useFilmDetails } from '../../hooks/useFilmDetails';
import type { Film } from '../../types/films.types';
import { useFilmsPage } from './FilmsPage.hooks';
import styles from './FilmsPage.module.css';

export function FilmsPage() {
  const [details, setDetails] = useState<{ id: string; title: string; data: Film } | null>(null);
  const {
    title,
    director,
    sortBy,
    sortOrder,
    page,
    selectedFilmId,
    charactersPage,
    setTitle,
    setDirector,
    setSortBy,
    setSortOrder,
    setPage,
    setSelectedFilmId,
    setCharactersPage,
    query,
    charactersQuery,
    filmDetailsQuery,
  } = useFilmsPage();

  const filmDetailsModalQuery = useFilmDetails(details?.id ?? null);
  const { options: directorOptions } = useDirectorOptions();

  const modalFilm = useMemo(() => {
    if (!details) return null;
    return filmDetailsModalQuery.data ?? details.data;
  }, [details, filmDetailsModalQuery.data]);

  return (
    <section>
      <div className={styles.filters}>
        <input
          className={styles.input}
          placeholder="Filtrar por título"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        
        <CustomSelect
          value={director}
          onChange={(value) => setDirector(value as string)}
          options={directorOptions}
          placeholder="Filtrar por diretor"
          className={styles.input}
        />

        <CustomSelect
          value={sortBy}
          onChange={(value) => setSortBy(value as typeof sortBy)}
          options={[
            { value: 'episode_id', label: 'Ordenar por episódio' },
            { value: 'title', label: 'Ordenar por título' },
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

      {query.isLoading && <p className={styles.status}>Carregando filmes...</p>}
      {query.isError && <p className={styles.status}>Erro ao carregar filmes.</p>}

      <div className={styles.grid}>
        {query.data?.items.map((film) => (
          <FilmCard
            key={film.id}
            film={film}
            variant="compact"
            isSelected={selectedFilmId === film.id}
            onSelect={(filmId) => {
              setSelectedFilmId(filmId);
              setCharactersPage(1);
            }}
            onViewDetails={() => setDetails({ id: film.id, title: film.title, data: film })}
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

      {selectedFilmId && (
        <section className={styles.charactersSection}>
          <h3 className={styles.sectionTitle}>Personagens do filme selecionado</h3>
          {filmDetailsQuery.isLoading && (
            <p className={styles.status}>Carregando detalhes do filme...</p>
          )}
          {filmDetailsQuery.isError && (
            <p className={styles.status}>Erro ao carregar detalhes do filme.</p>
          )}
          {filmDetailsQuery.data && (
            <>
              <p className={styles.status}>
                <strong>Opening crawl:</strong> {filmDetailsQuery.data.opening_crawl}
              </p>
              <p className={styles.status}>
                <strong>Planetas:</strong>{' '}
                {(filmDetailsQuery.data.planets ?? []).map((p) => p.name).join(', ') || '—'}
              </p>
              <p className={styles.status}>
                <strong>Naves:</strong>{' '}
                {(filmDetailsQuery.data.starships ?? []).map((s) => s.name).join(', ') || '—'}
              </p>
              <p className={styles.status}>
                <strong>Veículos:</strong>{' '}
                {(filmDetailsQuery.data.vehicles ?? []).map((v) => v.name).join(', ') || '—'}
              </p>
              <p className={styles.status}>
                <strong>Espécies:</strong>{' '}
                {(filmDetailsQuery.data.species ?? []).map((sp) => sp.name).join(', ') || '—'}
              </p>
            </>
          )}
          {charactersQuery.isLoading && (
            <p className={styles.status}>Carregando personagens...</p>
          )}
          {charactersQuery.isError && (
            <p className={styles.status}>Erro ao carregar personagens.</p>
          )}
          <div className={styles.grid}>
            {charactersQuery.data?.items.map((character) => (
              <CharacterCard key={character.id} character={character} />
            ))}
          </div>
          {charactersQuery.data?.meta && (
            <Pagination
              page={charactersPage}
              totalPages={charactersQuery.data.meta.total_pages}
              onPageChange={setCharactersPage}
            />
          )}
        </section>
      )}

      <DetailsModal open={!!details} title={details?.title ?? ''} onClose={() => setDetails(null)}>
        {filmDetailsModalQuery.isLoading && <p className={styles.status}>Carregando detalhes do filme...</p>}
        {filmDetailsModalQuery.isError && <p className={styles.status}>Erro ao carregar detalhes do filme.</p>}
        {modalFilm && <FilmCard film={modalFilm} />}
        {filmDetailsModalQuery.data && (
          <>
            <p className={styles.status}>
              <strong>Opening crawl:</strong> {filmDetailsModalQuery.data.opening_crawl}
            </p>
            <p className={styles.status}>
              <strong>Planetas:</strong>{' '}
              {(filmDetailsModalQuery.data.planets ?? []).map((p) => p.name).join(', ') || '—'}
            </p>
            <p className={styles.status}>
              <strong>Naves:</strong>{' '}
              {(filmDetailsModalQuery.data.starships ?? []).map((s) => s.name).join(', ') || '—'}
            </p>
            <p className={styles.status}>
              <strong>Veículos:</strong>{' '}
              {(filmDetailsModalQuery.data.vehicles ?? []).map((v) => v.name).join(', ') || '—'}
            </p>
            <p className={styles.status}>
              <strong>Espécies:</strong>{' '}
              {(filmDetailsModalQuery.data.species ?? []).map((sp) => sp.name).join(', ') || '—'}
            </p>
          </>
        )}
      </DetailsModal>
    </section>
  );
}
