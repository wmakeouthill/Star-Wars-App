import { useMemo, useState } from 'react';
import { CharacterCard } from '@/features/characters/components/CharacterCard';
import { useCharacters } from '@/features/characters/hooks/useCharacters';
import { FilmCard } from '@/features/films/components/FilmCard';
import { useFilmCharacters } from '@/features/films/hooks/useFilmCharacters';
import { useFilms } from '@/features/films/hooks/useFilms';
import { PlanetCard } from '@/features/planets/components/PlanetCard';
import { usePlanets } from '@/features/planets/hooks/usePlanets';
import { StarshipCard } from '@/features/starships/components/StarshipCard';
import { useStarships } from '@/features/starships/hooks/useStarships';
import { Pagination } from '@/shared/components';
import styles from './DashboardPage.module.css';

const PANEL_PAGE_SIZE = 6;

export function DashboardPage() {
  const [globalQuery, setGlobalQuery] = useState('');

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
              {charactersQuery.data?.items.map((character) => (
                <CharacterCard key={character.id} character={character} />
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
              {planetsQuery.data?.items.map((planet) => (
                <PlanetCard key={planet.id} planet={planet} />
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
              {starshipsQuery.data?.items.map((starship) => (
                <StarshipCard key={starship.id} starship={starship} />
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
              {filmsQuery.data?.items.map((film) => (
                <FilmCard
                  key={film.id}
                  film={film}
                  isSelected={selectedFilmId === film.id}
                  onSelect={(filmId) => {
                    setSelectedFilmId(filmId);
                    setFilmCharactersPage(1);
                  }}
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
                {filmCharactersQuery.data?.items.map((character) => (
                  <CharacterCard key={character.id} character={character} />
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
    </section>
  );
}

