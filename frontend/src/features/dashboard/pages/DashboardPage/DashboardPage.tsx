import { useEffect, useMemo, useRef, useState } from 'react';
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
import { SpeciesCard } from '@/features/species/components/SpeciesCard';
import { useSpeciesDetails } from '@/features/species/hooks/useSpeciesDetails';
import { useSpecies } from '@/features/species/hooks/useSpecies';
import type { Species } from '@/features/species/types/species.types';
import { StarshipCard } from '@/features/starships/components/StarshipCard';
import { useStarshipDetails } from '@/features/starships/hooks/useStarshipDetails';
import { useStarships } from '@/features/starships/hooks/useStarships';
import type { Starship } from '@/features/starships/types/starships.types';
import { VehicleCard } from '@/features/vehicles/components/VehicleCard';
import { useVehicleDetails } from '@/features/vehicles/hooks/useVehicleDetails';
import { useVehicles } from '@/features/vehicles/hooks/useVehicles';
import type { Vehicle } from '@/features/vehicles/types/vehicles.types';
import { Pagination, CustomSelect, FilmFilter } from '@/shared/components';
import {
  useGenderOptions,
  useClimateOptions,
  useStarshipManufacturerOptions,
  useVehicleManufacturerOptions,
  useVehicleClassOptions,
  useClassificationOptions,
  useLanguageOptions,
  useDirectorOptions,
} from '@/shared/hooks/useMetadataOptions';
import styles from './DashboardPage.module.css';

const DASHBOARD_MIN_CARD_WIDTH = 260;
const DASHBOARD_CARD_GAP = 16; // 1rem
const DASHBOARD_MAX_COLS = 6;

type DetailsState =
  | { kind: 'character'; id: string; title: string; data: Character }
  | { kind: 'planet'; id: string; title: string; data: Planet }
  | { kind: 'starship'; id: string; title: string; data: Starship }
  | { kind: 'vehicle'; id: string; title: string; data: Vehicle }
  | { kind: 'species'; id: string; title: string; data: Species }
  | { kind: 'film'; id: string; title: string; data: Film };

export function DashboardPage() {
  const [globalQuery, setGlobalQuery] = useState('');
  const [globalFilmId, setGlobalFilmId] = useState('');
  const [details, setDetails] = useState<DetailsState | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [cardsCols, setCardsCols] = useState(4);

  const [charactersGender, setCharactersGender] = useState('');
  const [charactersFilmId, setCharactersFilmId] = useState('');
  const [charactersPage, setCharactersPage] = useState(1);

  const [planetsClimate, setPlanetsClimate] = useState('');
  const [planetsPage, setPlanetsPage] = useState(1);

  const [starshipsManufacturer, setStarshipsManufacturer] = useState('');
  const [starshipsPage, setStarshipsPage] = useState(1);

  const [vehiclesManufacturer, setVehiclesManufacturer] = useState('');
  const [vehiclesClass, setVehiclesClass] = useState('');
  const [vehiclesPage, setVehiclesPage] = useState(1);

  const [speciesClassification, setSpeciesClassification] = useState('');
  const [speciesLanguage, setSpeciesLanguage] = useState('');
  const [speciesPage, setSpeciesPage] = useState(1);

  const [filmsDirector, setFilmsDirector] = useState('');
  const [filmsPage, setFilmsPage] = useState(1);
  const [selectedFilmId, setSelectedFilmId] = useState<string | null>(null);
  const [filmCharactersPage, setFilmCharactersPage] = useState(1);

  const dashboardPageSize = useMemo(() => {
    // Garante 1 linha por seção: pegamos exatamente a quantidade de colunas visíveis.
    return Math.max(1, Math.min(DASHBOARD_MAX_COLS, cardsCols));
  }, [cardsCols]);

  // Opções para os dropdowns de filtro
  const { options: genderOptions } = useGenderOptions();
  const { options: climateOptions } = useClimateOptions();
  const { options: starshipManufacturerOptions } = useStarshipManufacturerOptions();
  const { options: vehicleManufacturerOptions } = useVehicleManufacturerOptions();
  const { options: vehicleClassOptions } = useVehicleClassOptions();
  const { options: classificationOptions } = useClassificationOptions();
  const { options: languageOptions } = useLanguageOptions();
  const { options: directorOptions } = useDirectorOptions();

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    const computeCols = (width: number) => {
      const cols = Math.floor((width + DASHBOARD_CARD_GAP) / (DASHBOARD_MIN_CARD_WIDTH + DASHBOARD_CARD_GAP));
      return Math.max(1, Math.min(DASHBOARD_MAX_COLS, cols));
    };

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setCardsCols(computeCols(entry.contentRect.width));
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Se a quantidade de colunas mudar, resetamos páginas para evitar “sobrar 1 card” na linha de baixo
  // ou cair em página inválida.
  useEffect(() => {
    setCharactersPage(1);
    setPlanetsPage(1);
    setStarshipsPage(1);
    setVehiclesPage(1);
    setSpeciesPage(1);
    setFilmsPage(1);
    setFilmCharactersPage(1);
  }, [dashboardPageSize]);

  const charactersFilters = useMemo(
    () => ({
      name: globalQuery || undefined,
      gender: charactersGender || undefined,
      filmId: globalFilmId || charactersFilmId || undefined,
      sortBy: 'name' as const,
      sortOrder: 'asc' as const,
      page: charactersPage,
      pageSize: dashboardPageSize,
    }),
    [globalQuery, charactersGender, globalFilmId, charactersFilmId, charactersPage, dashboardPageSize]
  );

  const planetsFilters = useMemo(
    () => ({
      name: globalQuery || undefined,
      climate: planetsClimate || undefined,
      filmId: globalFilmId || undefined,
      sortBy: 'name' as const,
      sortOrder: 'asc' as const,
      page: planetsPage,
      pageSize: dashboardPageSize,
    }),
    [globalQuery, planetsClimate, globalFilmId, planetsPage, dashboardPageSize]
  );

  const starshipsFilters = useMemo(
    () => ({
      name: globalQuery || undefined,
      manufacturer: starshipsManufacturer || undefined,
      filmId: globalFilmId || undefined,
      sortBy: 'name' as const,
      sortOrder: 'asc' as const,
      page: starshipsPage,
      pageSize: dashboardPageSize,
    }),
    [globalQuery, starshipsManufacturer, globalFilmId, starshipsPage, dashboardPageSize]
  );

  const vehiclesFilters = useMemo(
    () => ({
      name: globalQuery || undefined,
      manufacturer: vehiclesManufacturer || undefined,
      vehicleClass: vehiclesClass || undefined,
      filmId: globalFilmId || undefined,
      sortBy: 'name' as const,
      sortOrder: 'asc' as const,
      page: vehiclesPage,
      pageSize: dashboardPageSize,
    }),
    [globalQuery, vehiclesManufacturer, vehiclesClass, globalFilmId, vehiclesPage, dashboardPageSize]
  );

  const speciesFilters = useMemo(
    () => ({
      name: globalQuery || undefined,
      classification: speciesClassification || undefined,
      language: speciesLanguage || undefined,
      filmId: globalFilmId || undefined,
      sortBy: 'name' as const,
      sortOrder: 'asc' as const,
      page: speciesPage,
      pageSize: dashboardPageSize,
    }),
    [globalQuery, speciesClassification, speciesLanguage, globalFilmId, speciesPage, dashboardPageSize]
  );

  const filmsFilters = useMemo(
    () => ({
      title: globalQuery || undefined,
      director: filmsDirector || undefined,
      sortBy: 'episode_id' as const,
      sortOrder: 'asc' as const,
      page: filmsPage,
      pageSize: dashboardPageSize,
    }),
    [globalQuery, filmsDirector, filmsPage, dashboardPageSize]
  );

  const charactersQuery = useCharacters(charactersFilters);
  const planetsQuery = usePlanets(planetsFilters);
  const starshipsQuery = useStarships(starshipsFilters);
  const vehiclesQuery = useVehicles(vehiclesFilters);
  const speciesQuery = useSpecies(speciesFilters);
  const filmsQuery = useFilms(filmsFilters);
  const filmCharactersQuery = useFilmCharacters(selectedFilmId, filmCharactersPage, dashboardPageSize);

  const characterDetailsQuery = useCharacterDetails(
    details?.kind === 'character' ? details.id : null
  );
  const planetDetailsQuery = usePlanetDetails(details?.kind === 'planet' ? details.id : null);
  const starshipDetailsQuery = useStarshipDetails(details?.kind === 'starship' ? details.id : null);
  const vehicleDetailsQuery = useVehicleDetails(details?.kind === 'vehicle' ? details.id : null);
  const speciesDetailsQuery = useSpeciesDetails(details?.kind === 'species' ? details.id : null);
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
              setVehiclesPage(1);
              setSpeciesPage(1);
              setFilmsPage(1);
            }}
            placeholder="Buscar em toda a galáxia…"
          />
          <FilmFilter
            value={globalFilmId}
            onChange={(value) => {
              setGlobalFilmId(value);
              setCharactersPage(1);
              setPlanetsPage(1);
              setStarshipsPage(1);
              setVehiclesPage(1);
              setSpeciesPage(1);
            }}
            className={styles.globalFilter}
          />
          <button
            type="button"
            className={styles.searchButton}
            onClick={() => {
              setGlobalQuery('');
              setGlobalFilmId('');
              setCharactersGender('');
              setCharactersFilmId('');
              setPlanetsClimate('');
              setStarshipsManufacturer('');
              setVehiclesManufacturer('');
              setVehiclesClass('');
              setSpeciesClassification('');
              setSpeciesLanguage('');
              setFilmsDirector('');
              setSelectedFilmId(null);
              setFilmCharactersPage(1);
              setCharactersPage(1);
              setPlanetsPage(1);
              setStarshipsPage(1);
              setVehiclesPage(1);
              setSpeciesPage(1);
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
            <span className={styles.statLabel}>🛻 Veículos</span>
            <span className={styles.statValue}>{vehiclesQuery.data?.meta.total ?? '—'}</span>
          </div>
          <div className={styles.statChip}>
            <span className={styles.statLabel}>🧬 Espécies</span>
            <span className={styles.statValue}>{speciesQuery.data?.meta.total ?? '—'}</span>
          </div>
          <div className={styles.statChip}>
            <span className={styles.statLabel}>🎬 Filmes</span>
            <span className={styles.statValue}>{filmsQuery.data?.meta.total ?? '—'}</span>
          </div>
        </div>
      </div>

      <div className={styles.grid} ref={gridRef}>
        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>👤 Personagens</h2>
            <div className={styles.panelControls}>
              <CustomSelect
                value={charactersGender}
                onChange={(value) => {
                  setCharactersGender(value as string);
                  setCharactersPage(1);
                }}
                options={genderOptions}
                placeholder="Gênero"
                className={styles.panelSelect}
              />
              <FilmFilter
                value={charactersFilmId}
                onChange={(value) => {
                  setCharactersFilmId(value);
                  setCharactersPage(1);
                }}
                className={styles.panelSelect}
              />
            </div>
          </header>

          <div className={styles.panelBody}>
            {charactersQuery.isLoading && <p className={styles.status}>Carregando personagens...</p>}
            {charactersQuery.isError && <p className={styles.status}>Erro ao carregar personagens.</p>}

            <div
              className={styles.cardsGrid}
              style={{ ['--cards-cols' as never]: dashboardPageSize } as React.CSSProperties}
            >
              {(charactersQuery.data?.items ?? []).map((character) => (
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
              <CustomSelect
                value={planetsClimate}
                onChange={(value) => {
                  setPlanetsClimate(value as string);
                  setPlanetsPage(1);
                }}
                options={[{ value: '', label: 'Todos os climas' }, ...climateOptions]}
                placeholder="Clima"
                className={styles.panelSelect}
              />
            </div>
          </header>

          <div className={styles.panelBody}>
            {planetsQuery.isLoading && <p className={styles.status}>Carregando planetas...</p>}
            {planetsQuery.isError && <p className={styles.status}>Erro ao carregar planetas.</p>}

            <div
              className={styles.cardsGrid}
              style={{ ['--cards-cols' as never]: dashboardPageSize } as React.CSSProperties}
            >
              {(planetsQuery.data?.items ?? []).map((planet) => (
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
              <CustomSelect
                value={starshipsManufacturer}
                onChange={(value) => {
                  setStarshipsManufacturer(value as string);
                  setStarshipsPage(1);
                }}
                options={starshipManufacturerOptions}
                placeholder="Fabricante"
                className={styles.panelSelect}
              />
            </div>
          </header>

          <div className={styles.panelBody}>
            {starshipsQuery.isLoading && <p className={styles.status}>Carregando naves...</p>}
            {starshipsQuery.isError && <p className={styles.status}>Erro ao carregar naves.</p>}

            <div
              className={styles.cardsGrid}
              style={{ ['--cards-cols' as never]: dashboardPageSize } as React.CSSProperties}
            >
              {(starshipsQuery.data?.items ?? []).map((starship) => (
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
            <h2 className={styles.panelTitle}>🛻 Veículos</h2>
            <div className={styles.panelControls}>
              <CustomSelect
                value={vehiclesManufacturer}
                onChange={(value) => {
                  setVehiclesManufacturer(value as string);
                  setVehiclesPage(1);
                }}
                options={vehicleManufacturerOptions}
                placeholder="Fabricante"
                className={styles.panelSelect}
              />
              <CustomSelect
                value={vehiclesClass}
                onChange={(value) => {
                  setVehiclesClass(value as string);
                  setVehiclesPage(1);
                }}
                options={vehicleClassOptions}
                placeholder="Classe"
                className={styles.panelSelect}
              />
            </div>
          </header>

          <div className={styles.panelBody}>
            {vehiclesQuery.isLoading && <p className={styles.status}>Carregando veículos...</p>}
            {vehiclesQuery.isError && <p className={styles.status}>Erro ao carregar veículos.</p>}

            <div
              className={styles.cardsGrid}
              style={{ ['--cards-cols' as never]: dashboardPageSize } as React.CSSProperties}
            >
              {(vehiclesQuery.data?.items ?? []).map((vehicle) => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  variant="compact"
                  onViewDetails={() =>
                    setDetails({
                      kind: 'vehicle',
                      id: vehicle.id,
                      title: vehicle.name,
                      data: vehicle,
                    })
                  }
                />
              ))}
            </div>
          </div>

          <footer className={styles.panelFooter}>
            {vehiclesQuery.data?.meta && (
              <Pagination
                page={vehiclesPage}
                totalPages={vehiclesQuery.data.meta.total_pages}
                onPageChange={setVehiclesPage}
              />
            )}
          </footer>
        </section>

        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>🧬 Espécies</h2>
            <div className={styles.panelControls}>
              <CustomSelect
                value={speciesClassification}
                onChange={(value) => {
                  setSpeciesClassification(value as string);
                  setSpeciesPage(1);
                }}
                options={classificationOptions}
                placeholder="Classificação"
                className={styles.panelSelect}
              />
              <CustomSelect
                value={speciesLanguage}
                onChange={(value) => {
                  setSpeciesLanguage(value as string);
                  setSpeciesPage(1);
                }}
                options={languageOptions}
                placeholder="Idioma"
                className={styles.panelSelect}
              />
            </div>
          </header>

          <div className={styles.panelBody}>
            {speciesQuery.isLoading && <p className={styles.status}>Carregando espécies...</p>}
            {speciesQuery.isError && <p className={styles.status}>Erro ao carregar espécies.</p>}

            <div
              className={styles.cardsGrid}
              style={{ ['--cards-cols' as never]: dashboardPageSize } as React.CSSProperties}
            >
              {(speciesQuery.data?.items ?? []).map((species) => (
                <SpeciesCard
                  key={species.id}
                  species={species}
                  variant="compact"
                  onViewDetails={() =>
                    setDetails({
                      kind: 'species',
                      id: species.id,
                      title: species.name,
                      data: species,
                    })
                  }
                />
              ))}
            </div>
          </div>

          <footer className={styles.panelFooter}>
            {speciesQuery.data?.meta && (
              <Pagination
                page={speciesPage}
                totalPages={speciesQuery.data.meta.total_pages}
                onPageChange={setSpeciesPage}
              />
            )}
          </footer>
        </section>

        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>🎬 Crônicas (Filmes)</h2>
            <div className={styles.panelControls}>
              <CustomSelect
                value={filmsDirector}
                onChange={(value) => {
                  setFilmsDirector(value as string);
                  setFilmsPage(1);
                }}
                options={directorOptions}
                placeholder="Diretor"
                className={styles.panelSelect}
              />
            </div>
          </header>

          <div className={styles.panelBody}>
            {filmsQuery.isLoading && <p className={styles.status}>Carregando filmes...</p>}
            {filmsQuery.isError && <p className={styles.status}>Erro ao carregar filmes.</p>}

            <div
              className={styles.cardsGrid}
              style={{ ['--cards-cols' as never]: dashboardPageSize } as React.CSSProperties}
            >
              {(filmsQuery.data?.items ?? []).map((film) => (
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

              <div
                className={styles.cardsGrid}
                style={{ ['--cards-cols' as never]: dashboardPageSize } as React.CSSProperties}
              >
                {(filmCharactersQuery.data?.items ?? []).map((character) => (
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

              {details.kind === 'vehicle' && (
                <>
                  <VehicleCard vehicle={vehicleDetailsQuery.data ?? details.data} />

                  <div className={styles.detailsSection}>
                    <h4 className={styles.detailsSectionTitle}>Dados completos</h4>
                    {vehicleDetailsQuery.isLoading && (
                      <p className={styles.detailsLine}>Carregando detalhes do veículo...</p>
                    )}
                    {vehicleDetailsQuery.isError && (
                      <p className={styles.detailsLine}>Erro ao carregar detalhes do veículo.</p>
                    )}
                  </div>
                </>
              )}

              {details.kind === 'species' && (
                <>
                  <SpeciesCard species={speciesDetailsQuery.data ?? details.data} />

                  <div className={styles.detailsSection}>
                    <h4 className={styles.detailsSectionTitle}>Dados completos</h4>
                    {speciesDetailsQuery.isLoading && (
                      <p className={styles.detailsLine}>Carregando detalhes da espécie...</p>
                    )}
                    {speciesDetailsQuery.isError && (
                      <p className={styles.detailsLine}>Erro ao carregar detalhes da espécie.</p>
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

