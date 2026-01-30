import { useEffect, useMemo, useState } from 'react';
import { CharacterCard } from '@/features/characters/components/CharacterCard';
import { useCharacters } from '@/features/characters/hooks/useCharacters';
import { useCharacterDetails } from '@/features/characters/hooks/useCharacterDetails';
import type { Character } from '@/features/characters/types/characters.types';
import { FilmCard } from '@/features/films/components/FilmCard';
import { useFilmCharacters } from '@/features/films/hooks/useFilmCharacters';
import { useFilms } from '@/features/films/hooks/useFilms';
import { useFilmDetails } from '@/features/films/hooks/useFilmDetails';
import type { Film } from '@/features/films/types/films.types';
import { PlanetCard } from '@/features/planets/components/PlanetCard';
import { usePlanetDetails } from '@/features/planets/hooks/usePlanetDetails';
import { usePlanets } from '@/features/planets/hooks/usePlanets';
import type { Planet } from '@/features/planets/types/planets.types';
import { StarshipCard } from '@/features/starships/components/StarshipCard';
import { useStarshipDetails } from '@/features/starships/hooks/useStarshipDetails';
import { useStarships } from '@/features/starships/hooks/useStarships';
import type { Starship } from '@/features/starships/types/starships.types';
import { Pagination } from '@/shared/components';
import styles from './DashboardPage.module.css';

const PANEL_PAGE_SIZE = 5;

type DetailsState =
  | { kind: 'character'; id: string; title: string; data: Character }
  | { kind: 'planet'; id: string; title: string; data: Planet }
  | { kind: 'starship'; id: string; title: string; data: Starship }
  | { kind: 'film'; id: string; title: string; data: Film };

export function DashboardPage() {
  const [globalQuery, setGlobalQuery] = useState('');
  const [details, setDetails] = useState<DetailsState | null>(null);

  const [charactersGender, setCharactersGender] = useState('');
  const [charactersFilmId, setCharactersFilmId] = useState('');
  const [charactersPage, setCharactersPage] = useState(1);

  const [planetsClimate, setPlanetsClimate] = useState('');
  const [planetsPage, setPlanetsPage] = useState(1);

  const [starshipsManufacturer, setStarshipsManufacturer] = useState('');
  const [starshipsPage, setStarshipsPage] = useState(1);

  const [filmsDirector, setFilmsDirector] = useState('');
  const [filmsPage, setFilmsPage] = useState(1);
  const [selectedFilmId, setSelectedFilmId] = useState<string | null>(null);
  const [filmCharactersPage, setFilmCharactersPage] = useState(1);

  const charactersFilters = useMemo(
    () => ({
      name: globalQuery || undefined,
      gender: charactersGender || undefined,
      filmId: charactersFilmId || undefined,
      sortBy: 'name' as const,
      sortOrder: 'asc' as const,
      page: charactersPage,
      pageSize: PANEL_PAGE_SIZE,
    }),
    [globalQuery, charactersGender, charactersFilmId, charactersPage]
  );

  const planetsFilters = useMemo(
    () => ({
      name: globalQuery || undefined,
      climate: planetsClimate || undefined,
      sortBy: 'name' as const,
      sortOrder: 'asc' as const,
      page: planetsPage,
      pageSize: PANEL_PAGE_SIZE,
    }),
    [globalQuery, planetsClimate, planetsPage]
  );

  const starshipsFilters = useMemo(
    () => ({
      name: globalQuery || undefined,
      manufacturer: starshipsManufacturer || undefined,
      sortBy: 'name' as const,
      sortOrder: 'asc' as const,
      page: starshipsPage,
      pageSize: PANEL_PAGE_SIZE,
    }),
    [globalQuery, starshipsManufacturer, starshipsPage]
  );

  const filmsFilters = useMemo(
    () => ({
      title: globalQuery || undefined,
      director: filmsDirector || undefined,
      sortBy: 'episode_id' as const,
      sortOrder: 'asc' as const,
      page: filmsPage,
      pageSize: PANEL_PAGE_SIZE,
    }),
    [globalQuery, filmsDirector, filmsPage]
  );

  const charactersQuery = useCharacters(charactersFilters);
  const planetsQuery = usePlanets(planetsFilters);
  const starshipsQuery = useStarships(starshipsFilters);
  const filmsQuery = useFilms(filmsFilters);
  const filmCharactersQuery = useFilmCharacters(selectedFilmId, filmCharactersPage, PANEL_PAGE_SIZE);

  const characterDetailsQuery = useCharacterDetails(
    details?.kind === 'character' ? details.id : null
  );
  const planetDetailsQuery = usePlanetDetails(details?.kind === 'planet' ? details.id : null);
  const starshipDetailsQuery = useStarshipDetails(details?.kind === 'starship' ? details.id : null);
  const filmDetailsQuery = useFilmDetails(details?.kind === 'film' ? details.id : null);

  useEffect(() => {
    if (!details) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setDetails(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [details]);

  return (
    <section className={styles.container}>
      <div className={styles.commandBar}>
        <div className={styles.brand}>
          <div className={styles.kicker}>Central do Holocron</div>
          <div className={styles.hint}>Veja tudo. Filtre tudo. Um painel — a galáxia inteira.</div>
        </div>

        <div className={styles.search}>
          <input
            className={styles.searchInput}
            value={globalQuery}
            onChange={(e) => {
              setGlobalQuery(e.target.value);
              setCharactersPage(1);
              setPlanetsPage(1);
              setStarshipsPage(1);
              setFilmsPage(1);
            }}
            placeholder="Buscar em toda a galáxia… (nome, planeta, nave, filme)"
          />
          <button
            type="button"
            className={styles.searchButton}
            onClick={() => {
              setGlobalQuery('');
              setCharactersGender('');
              setCharactersFilmId('');
              setPlanetsClimate('');
              setStarshipsManufacturer('');
              setFilmsDirector('');
              setSelectedFilmId(null);
              setFilmCharactersPage(1);
              setCharactersPage(1);
              setPlanetsPage(1);
              setStarshipsPage(1);
              setFilmsPage(1);
            }}
          >
            Limpar
          </button>
        </div>

        <div className={styles.stats}>
          <div className={styles.statChip}>
            <span className={styles.statLabel}>👤 Personagens</span>
            <span className={styles.statValue}>{charactersQuery.data?.meta.total ?? '—'}</span>
          </div>
          <div className={styles.statChip}>
            <span className={styles.statLabel}>🌍 Planetas</span>
            <span className={styles.statValue}>{planetsQuery.data?.meta.total ?? '—'}</span>
          </div>
          <div className={styles.statChip}>
            <span className={styles.statLabel}>🚀 Naves</span>
            <span className={styles.statValue}>{starshipsQuery.data?.meta.total ?? '—'}</span>
          </div>
          <div className={styles.statChip}>
            <span className={styles.statLabel}>🎬 Filmes</span>
            <span className={styles.statValue}>{filmsQuery.data?.meta.total ?? '—'}</span>
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>👤 Personagens</h2>
            <div className={styles.panelControls}>
              <input
                className={styles.panelInput}
                value={charactersGender}
                onChange={(e) => {
                  setCharactersGender(e.target.value);
                  setCharactersPage(1);
                }}
                placeholder="Gênero"
              />
              <input
                className={styles.panelInput}
                value={charactersFilmId}
                onChange={(e) => {
                  setCharactersFilmId(e.target.value);
                  setCharactersPage(1);
                }}
                placeholder="Filme ID"
              />
            </div>
          </header>

          <div className={styles.panelBody}>
            {charactersQuery.isLoading && <p className={styles.status}>Carregando personagens...</p>}
            {charactersQuery.isError && <p className={styles.status}>Erro ao carregar personagens.</p>}

            <div className={styles.cardsGrid}>
              {(charactersQuery.data?.items ?? []).slice(0, 5).map((character) => (
                <CharacterCard
                  key={character.id}
                  character={character}
                  variant="compact"
                  onViewDetails={() =>
                    setDetails({
                      kind: 'character',
                      id: character.id,
                      title: character.name,
                      data: character,
                    })
                  }
                />
              ))}
            </div>
          </div>

          <footer className={styles.panelFooter}>
            {charactersQuery.data?.meta && (
              <Pagination
                page={charactersPage}
                totalPages={charactersQuery.data.meta.total_pages}
                onPageChange={setCharactersPage}
              />
            )}
          </footer>
        </section>

        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>🌍 Planetas</h2>
            <div className={styles.panelControls}>
              <input
                className={styles.panelInput}
                value={planetsClimate}
                onChange={(e) => {
                  setPlanetsClimate(e.target.value);
                  setPlanetsPage(1);
                }}
                placeholder="Clima"
              />
            </div>
          </header>

          <div className={styles.panelBody}>
            {planetsQuery.isLoading && <p className={styles.status}>Carregando planetas...</p>}
            {planetsQuery.isError && <p className={styles.status}>Erro ao carregar planetas.</p>}

            <div className={styles.cardsGrid}>
              {(planetsQuery.data?.items ?? []).slice(0, 5).map((planet) => (
                <PlanetCard
                  key={planet.id}
                  planet={planet}
                  variant="compact"
                  onViewDetails={() =>
                    setDetails({
                      kind: 'planet',
                      id: planet.id,
                      title: planet.name,
                      data: planet,
                    })
                  }
                />
              ))}
            </div>
          </div>

          <footer className={styles.panelFooter}>
            {planetsQuery.data?.meta && (
              <Pagination
                page={planetsPage}
                totalPages={planetsQuery.data.meta.total_pages}
                onPageChange={setPlanetsPage}
              />
            )}
          </footer>
        </section>

        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>🚀 Naves</h2>
            <div className={styles.panelControls}>
              <input
                className={styles.panelInput}
                value={starshipsManufacturer}
                onChange={(e) => {
                  setStarshipsManufacturer(e.target.value);
                  setStarshipsPage(1);
                }}
                placeholder="Fabricante"
              />
            </div>
          </header>

          <div className={styles.panelBody}>
            {starshipsQuery.isLoading && <p className={styles.status}>Carregando naves...</p>}
            {starshipsQuery.isError && <p className={styles.status}>Erro ao carregar naves.</p>}

            <div className={styles.cardsGrid}>
              {(starshipsQuery.data?.items ?? []).slice(0, 5).map((starship) => (
                <StarshipCard
                  key={starship.id}
                  starship={starship}
                  variant="compact"
                  onViewDetails={() =>
                    setDetails({
                      kind: 'starship',
                      id: starship.id,
                      title: starship.name,
                      data: starship,
                    })
                  }
                />
              ))}
            </div>
          </div>

          <footer className={styles.panelFooter}>
            {starshipsQuery.data?.meta && (
              <Pagination
                page={starshipsPage}
                totalPages={starshipsQuery.data.meta.total_pages}
                onPageChange={setStarshipsPage}
              />
            )}
          </footer>
        </section>

        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>🎬 Crônicas (Filmes)</h2>
            <div className={styles.panelControls}>
              <input
                className={styles.panelInput}
                value={filmsDirector}
                onChange={(e) => {
                  setFilmsDirector(e.target.value);
                  setFilmsPage(1);
                }}
                placeholder="Diretor"
              />
            </div>
          </header>

          <div className={styles.panelBody}>
            {filmsQuery.isLoading && <p className={styles.status}>Carregando filmes...</p>}
            {filmsQuery.isError && <p className={styles.status}>Erro ao carregar filmes.</p>}

            <div className={styles.cardsGrid}>
              {(filmsQuery.data?.items ?? []).slice(0, 5).map((film) => (
                <FilmCard
                  key={film.id}
                  film={film}
                  variant="compact"
                  isSelected={selectedFilmId === film.id}
                  onSelect={(filmId) => {
                    setSelectedFilmId(filmId);
                    setFilmCharactersPage(1);
                  }}
                  onViewDetails={() =>
                    setDetails({
                      kind: 'film',
                      id: film.id,
                      title: film.title,
                      data: film,
                    })
                  }
                />
              ))}
            </div>
          </div>

          <footer className={styles.panelFooter}>
            {filmsQuery.data?.meta && (
              <Pagination
                page={filmsPage}
                totalPages={filmsQuery.data.meta.total_pages}
                onPageChange={setFilmsPage}
              />
            )}
          </footer>

          {selectedFilmId && (
            <div className={styles.subPanel}>
              <div className={styles.subPanelHeader}>
                <div className={styles.subPanelTitle}>Personagens do filme selecionado</div>
                <button
                  type="button"
                  className={styles.subPanelClose}
                  onClick={() => setSelectedFilmId(null)}
                >
                  Fechar
                </button>
              </div>

              {filmCharactersQuery.isLoading && (
                <p className={styles.status}>Carregando personagens...</p>
              )}
              {filmCharactersQuery.isError && (
                <p className={styles.status}>Erro ao carregar personagens.</p>
              )}

              <div className={styles.cardsGrid}>
                {(filmCharactersQuery.data?.items ?? []).slice(0, 5).map((character) => (
                  <CharacterCard
                    key={character.id}
                    character={character}
                    variant="compact"
                    onViewDetails={() =>
                      setDetails({
                        kind: 'character',
                        id: character.id,
                        title: character.name,
                        data: character,
                      })
                    }
                  />
                ))}
              </div>

              {filmCharactersQuery.data?.meta && (
                <div className={styles.subPanelFooter}>
                  <Pagination
                    page={filmCharactersPage}
                    totalPages={filmCharactersQuery.data.meta.total_pages}
                    onPageChange={setFilmCharactersPage}
                  />
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {details && (
        <div
          className={styles.detailsOverlay}
          role="presentation"
          onClick={() => setDetails(null)}
        >
          <div
            className={styles.detailsDialog}
            role="dialog"
            aria-modal="true"
            aria-label={`Detalhes: ${details.title}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.detailsHeader}>
              <h3 className={styles.detailsTitle}>{details.title}</h3>
              <button
                type="button"
                className={styles.detailsClose}
                onClick={() => setDetails(null)}
              >
                Fechar
              </button>
            </div>

            <div className={styles.detailsContent}>
              {details.kind === 'character' && (
                <>
                  <CharacterCard character={characterDetailsQuery.data ?? details.data} />

                  <div className={styles.detailsSection}>
                    <h4 className={styles.detailsSectionTitle}>Dados completos</h4>
                    {characterDetailsQuery.isLoading && (
                      <p className={styles.detailsLine}>Carregando detalhes do personagem...</p>
                    )}
                    {characterDetailsQuery.isError && (
                      <p className={styles.detailsLine}>Erro ao carregar detalhes do personagem.</p>
                    )}
                    {characterDetailsQuery.data && (
                      <>
                        {characterDetailsQuery.data.homeworld?.name && (
                          <p className={styles.detailsLine}>
                            <strong>Planeta natal:</strong> {characterDetailsQuery.data.homeworld.name}
                          </p>
                        )}
                        <p className={styles.detailsLine}>
                          <strong>Filmes:</strong>{' '}
                          {(characterDetailsQuery.data.films ?? []).map((f) => f.title).join(', ') ||
                            '—'}
                        </p>
                        <p className={styles.detailsLine}>
                          <strong>Espécies:</strong>{' '}
                          {(characterDetailsQuery.data.species ?? []).map((s) => s.name).join(', ') ||
                            '—'}
                        </p>
                        <p className={styles.detailsLine}>
                          <strong>Veículos:</strong>{' '}
                          {(characterDetailsQuery.data.vehicles ?? [])
                            .map((v) => v.name)
                            .join(', ') || '—'}
                        </p>
                        <p className={styles.detailsLine}>
                          <strong>Naves:</strong>{' '}
                          {(characterDetailsQuery.data.starships ?? [])
                            .map((s) => s.name)
                            .join(', ') || '—'}
                        </p>
                      </>
                    )}
                  </div>
                </>
              )}

              {details.kind === 'planet' && (
                <>
                  <PlanetCard planet={planetDetailsQuery.data ?? details.data} />

                  <div className={styles.detailsSection}>
                    <h4 className={styles.detailsSectionTitle}>Dados completos</h4>
                    {planetDetailsQuery.isLoading && (
                      <p className={styles.detailsLine}>Carregando detalhes do planeta...</p>
                    )}
                    {planetDetailsQuery.isError && (
                      <p className={styles.detailsLine}>Erro ao carregar detalhes do planeta.</p>
                    )}
                    {planetDetailsQuery.data && (
                      <>
                        <p className={styles.detailsLine}>
                          <strong>Residentes:</strong>{' '}
                          {(planetDetailsQuery.data.residents ?? []).map((r) => r.name).join(', ') ||
                            '—'}
                        </p>
                        <p className={styles.detailsLine}>
                          <strong>Filmes:</strong>{' '}
                          {(planetDetailsQuery.data.films_detail ?? [])
                            .map((f) => f.title)
                            .join(', ') || '—'}
                        </p>
                      </>
                    )}
                  </div>
                </>
              )}

              {details.kind === 'starship' && (
                <>
                  <StarshipCard starship={starshipDetailsQuery.data ?? details.data} />

                  <div className={styles.detailsSection}>
                    <h4 className={styles.detailsSectionTitle}>Dados completos</h4>
                    {starshipDetailsQuery.isLoading && (
                      <p className={styles.detailsLine}>Carregando detalhes da nave...</p>
                    )}
                    {starshipDetailsQuery.isError && (
                      <p className={styles.detailsLine}>Erro ao carregar detalhes da nave.</p>
                    )}
                    {starshipDetailsQuery.data && (
                      <>
                        <p className={styles.detailsLine}>
                          <strong>Pilotos:</strong>{' '}
                          {(starshipDetailsQuery.data.pilots ?? [])
                            .map((p) => p.name)
                            .join(', ') || '—'}
                        </p>
                        <p className={styles.detailsLine}>
                          <strong>Filmes:</strong>{' '}
                          {(starshipDetailsQuery.data.films ?? [])
                            .map((f) => f.title)
                            .join(', ') || '—'}
                        </p>
                      </>
                    )}
                  </div>
                </>
              )}

              {details.kind === 'film' && (
                <>
                  <FilmCard film={filmDetailsQuery.data ?? details.data} />

                  <div className={styles.detailsSection}>
                    <h4 className={styles.detailsSectionTitle}>Dados completos</h4>
                    {filmDetailsQuery.isLoading && (
                      <p className={styles.detailsLine}>Carregando detalhes do filme...</p>
                    )}
                    {filmDetailsQuery.isError && (
                      <p className={styles.detailsLine}>Erro ao carregar detalhes do filme.</p>
                    )}
                    {filmDetailsQuery.data && (
                      <>
                        <p className={styles.detailsLine}>
                          <strong>Opening crawl:</strong> {filmDetailsQuery.data.opening_crawl}
                        </p>
                        <p className={styles.detailsLine}>
                          <strong>Planetas:</strong>{' '}
                          {(filmDetailsQuery.data.planets ?? []).map((p) => p.name).join(', ') || '—'}
                        </p>
                        <p className={styles.detailsLine}>
                          <strong>Naves:</strong>{' '}
                          {(filmDetailsQuery.data.starships ?? []).map((s) => s.name).join(', ') ||
                            '—'}
                        </p>
                        <p className={styles.detailsLine}>
                          <strong>Veículos:</strong>{' '}
                          {(filmDetailsQuery.data.vehicles ?? []).map((v) => v.name).join(', ') ||
                            '—'}
                        </p>
                        <p className={styles.detailsLine}>
                          <strong>Espécies:</strong>{' '}
                          {(filmDetailsQuery.data.species ?? []).map((sp) => sp.name).join(', ') ||
                            '—'}
                        </p>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

