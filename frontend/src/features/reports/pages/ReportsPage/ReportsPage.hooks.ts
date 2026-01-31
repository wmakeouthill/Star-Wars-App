import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCharacters } from '@/features/characters/services/characters.service';
import { fetchFilms } from '@/features/films/services/films.service';
import { fetchPlanets } from '@/features/planets/services/planets.service';
import { fetchStarships } from '@/features/starships/services/starships.service';
import { fetchSpecies } from '@/features/species/services/species.service';
import { fetchVehicles } from '@/features/vehicles/services/vehicles.service';
import {
  fetchDailyChallenge,
  fetchGamificationAchievements,
  fetchGamificationLeaderboard,
  fetchGamificationProfile,
} from '@/features/gamification/services/gamification.service';
import type { ChartDatum, ScatterDatum, RadarDatum, TreemapDatum, StackedDatum } from '@/features/reports/types/reports.types';
import type { ReportsSnapshot } from './ReportsPage.types';

const REPORTS_PAGE_SIZE = 100;
const UNKNOWN_LABEL = 'Desconhecido';
const OTHER_LABEL = 'Outros';

// Cache times
const STALE_TIME_SWAPI = 1000 * 60 * 60 * 24; // 24 horas para dados estáticos da SWAPI
const STALE_TIME_USER = 1000 * 60 * 5; // 5 minutos para dados do usuário

function normalizeLabel(value: string | null | undefined): string {
  const raw = (value ?? '').trim();
  if (!raw) return UNKNOWN_LABEL;
  const lower = raw.toLowerCase();
  if (lower === 'unknown' || lower === 'n/a' || lower === 'none' || lower === 'indefinite') return UNKNOWN_LABEL;
  return raw;
}

function splitMulti(value: string | null | undefined): string[] {
  const normalized = normalizeLabel(value);
  if (normalized === UNKNOWN_LABEL) return [UNKNOWN_LABEL];

  return normalized
    .split(',')
    .map((part) => normalizeLabel(part))
    .filter((part) => !!part);
}

function toTopCounts(values: string[], topN: number): ChartDatum[] {
  const counts = new Map<string, number>();
  values.forEach((v) => {
    const key = normalizeLabel(v);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  const entries = Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const top = entries.slice(0, topN);
  const rest = entries.slice(topN);
  const restTotal = rest.reduce((sum, item) => sum + item.value, 0);
  if (restTotal > 0) top.push({ name: OTHER_LABEL, value: restTotal });
  return top;
}

function bucketHeightCm(height: number | null): string {
  if (height == null) return UNKNOWN_LABEL;
  if (height < 100) return '< 100 cm';
  if (height < 150) return '100–149 cm';
  if (height < 180) return '150–179 cm';
  if (height < 200) return '180–199 cm';
  return '≥ 200 cm';
}

function bucketMassKg(mass: number | null): string {
  if (mass == null) return UNKNOWN_LABEL;
  if (mass < 50) return '< 50 kg';
  if (mass < 80) return '50–79 kg';
  if (mass < 100) return '80–99 kg';
  if (mass < 150) return '100–149 kg';
  return '≥ 150 kg';
}

function bucketPopulation(population: number | null): string {
  if (population == null) return UNKNOWN_LABEL;
  if (population === 0) return '0';
  if (population < 1_000) return '1–999';
  if (population < 1_000_000) return '1K–999K';
  if (population < 1_000_000_000) return '1M–999M';
  return '≥ 1B';
}

function bucketDiameter(diameter: number | null): string {
  if (diameter == null) return UNKNOWN_LABEL;
  if (diameter < 5000) return '< 5.000 km';
  if (diameter < 10000) return '5K–10K km';
  if (diameter < 15000) return '10K–15K km';
  if (diameter < 50000) return '15K–50K km';
  return '≥ 50.000 km';
}

function bucketSurfaceWater(water: number | null): string {
  if (water == null) return UNKNOWN_LABEL;
  if (water === 0) return '0%';
  if (water <= 20) return '1–20%';
  if (water <= 50) return '21–50%';
  if (water <= 80) return '51–80%';
  return '81–100%';
}

function bucketCrew(crew: number | null): string {
  if (crew == null) return UNKNOWN_LABEL;
  if (crew === 0) return '0';
  if (crew <= 5) return '1–5';
  if (crew <= 50) return '6–50';
  if (crew <= 500) return '51–500';
  return '≥ 501';
}

function bucketPassengers(passengers: number | null): string {
  if (passengers == null) return UNKNOWN_LABEL;
  if (passengers === 0) return '0';
  if (passengers <= 10) return '1–10';
  if (passengers <= 100) return '11–100';
  if (passengers <= 1000) return '101–1000';
  return '≥ 1001';
}

function bucketCostCredits(cost: number | null): string {
  if (cost == null) return UNKNOWN_LABEL;
  if (cost < 50000) return '< 50K';
  if (cost < 200000) return '50K–200K';
  if (cost < 1000000) return '200K–1M';
  if (cost < 100000000) return '1M–100M';
  return '≥ 100M';
}

function bucketHyperdrive(rating: number | null): string {
  if (rating == null) return UNKNOWN_LABEL;
  if (rating <= 1) return '≤ 1.0 (Rápido)';
  if (rating <= 2) return '1.1–2.0';
  if (rating <= 3) return '2.1–3.0';
  if (rating <= 4) return '3.1–4.0';
  return '> 4.0 (Lento)';
}

function bucketLength(length: number | null): string {
  if (length == null) return UNKNOWN_LABEL;
  if (length < 20) return '< 20m';
  if (length < 50) return '20–50m';
  if (length < 150) return '50–150m';
  if (length < 500) return '150–500m';
  return '≥ 500m';
}

function bucketCargo(cargo: number | null): string {
  if (cargo == null) return UNKNOWN_LABEL;
  if (cargo < 100) return '< 100 kg';
  if (cargo < 1000) return '100–1K kg';
  if (cargo < 100000) return '1K–100K kg';
  if (cargo < 10000000) return '100K–10M kg';
  return '≥ 10M kg';
}

function bucketAvgHeight(height: number | null): string {
  if (height == null) return UNKNOWN_LABEL;
  if (height < 100) return '< 100 cm';
  if (height < 150) return '100–149 cm';
  if (height < 200) return '150–199 cm';
  if (height < 250) return '200–249 cm';
  return '≥ 250 cm';
}

function bucketAvgLifespan(lifespan: number | null): string {
  if (lifespan == null) return UNKNOWN_LABEL;
  if (lifespan < 50) return '< 50 anos';
  if (lifespan < 100) return '50–99 anos';
  if (lifespan < 200) return '100–199 anos';
  if (lifespan < 500) return '200–499 anos';
  return '≥ 500 anos';
}

function toBuckets<T>(
  items: T[],
  getBucket: (item: T) => string,
  order: string[]
): ChartDatum[] {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    const key = normalizeLabel(getBucket(item));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return order
    .filter((name) => counts.has(name))
    .map((name) => ({ name, value: counts.get(name) ?? 0 }));
}

function yearFromDate(date: string | null | undefined): string {
  const raw = (date ?? '').trim();
  if (!raw) return UNKNOWN_LABEL;
  const year = raw.slice(0, 4);
  return /^\d{4}$/.test(year) ? year : UNKNOWN_LABEL;
}

function normalizeGravity(gravity: string | null | undefined): string {
  const raw = normalizeLabel(gravity).toLowerCase();
  if (raw === UNKNOWN_LABEL.toLowerCase()) return UNKNOWN_LABEL;
  if (raw.includes('standard') || raw === '1') return 'Standard (1g)';
  if (raw.includes('0') || parseFloat(raw) < 0.8) return 'Baixa (< 0.8g)';
  if (parseFloat(raw) > 1.2) return 'Alta (> 1.2g)';
  return 'Standard (1g)';
}

async function fetchSwapiData() {
  const [characters, planets, starships, films, species, vehicles] = await Promise.all([
    fetchCharacters({ page: 1, pageSize: REPORTS_PAGE_SIZE, sortBy: 'name', sortOrder: 'asc' }),
    fetchPlanets({ page: 1, pageSize: REPORTS_PAGE_SIZE, sortBy: 'name', sortOrder: 'asc' }),
    fetchStarships({ page: 1, pageSize: REPORTS_PAGE_SIZE, sortBy: 'name', sortOrder: 'asc' }),
    fetchFilms({ page: 1, pageSize: REPORTS_PAGE_SIZE, sortBy: 'episode_id', sortOrder: 'asc' }),
    fetchSpecies({ page: 1, pageSize: REPORTS_PAGE_SIZE, sortBy: 'name', sortOrder: 'asc' }),
    fetchVehicles({ page: 1, pageSize: REPORTS_PAGE_SIZE, sortBy: 'name', sortOrder: 'asc' }),
  ]);
  return { characters, planets, starships, films, species, vehicles };
}

async function fetchUserData() {
  const [profile, achievements, leaderboard, dailyChallenge] = await Promise.all([
    fetchGamificationProfile(),
    fetchGamificationAchievements(),
    fetchGamificationLeaderboard(10),
    fetchDailyChallenge(),
  ]);
  return { profile, achievements, leaderboard, dailyChallenge };
}

export function useReportsPage() {
  // Dados SWAPI - cache de 24 horas (dados estáticos)
  const swapiQuery = useQuery({
    queryKey: ['reports', 'swapi'],
    queryFn: fetchSwapiData,
    staleTime: STALE_TIME_SWAPI,
  });

  // Dados do usuário - cache de 5 minutos (dados dinâmicos)
  const userQuery = useQuery({
    queryKey: ['reports', 'user'],
    queryFn: fetchUserData,
    staleTime: STALE_TIME_USER,
  });

  const snapshotQuery = {
    isLoading: swapiQuery.isLoading || userQuery.isLoading,
    isError: swapiQuery.isError || userQuery.isError,
    data: swapiQuery.data && userQuery.data ? { ...swapiQuery.data, ...userQuery.data } : undefined,
  };

  const report = useMemo<ReportsSnapshot | null>(() => {
    if (!snapshotQuery.data) return null;

    const { characters, planets, starships, films, species, vehicles, profile, achievements, leaderboard, dailyChallenge } =
      snapshotQuery.data;

    const charactersItems = characters.items ?? [];
    const planetsItems = planets.items ?? [];
    const starshipsItems = starships.items ?? [];
    const filmsItems = films.items ?? [];
    const speciesItems = species.items ?? [];
    const vehiclesItems = vehicles.items ?? [];

    // ═══════════════════════════════════════════════════════════════
    // CHARACTERS
    // ═══════════════════════════════════════════════════════════════
    const gender = toTopCounts(charactersItems.map((c) => normalizeLabel(c.gender)), 6);
    const heightBucketsOrder = [UNKNOWN_LABEL, '< 100 cm', '100–149 cm', '150–179 cm', '180–199 cm', '≥ 200 cm'];
    const heightBuckets = toBuckets(charactersItems, (c) => bucketHeightCm(c.height), heightBucketsOrder);

    const hairValues = charactersItems.flatMap((c) => splitMulti(c.hair_color));
    const hairColorsTop = toTopCounts(hairValues, 8);

    const eyeValues = charactersItems.flatMap((c) => splitMulti(c.eye_color));
    const eyeColorsTop = toTopCounts(eyeValues, 8);

    const skinValues = charactersItems.flatMap((c) => splitMulti(c.skin_color));
    const skinColorsTop = toTopCounts(skinValues, 8);

    const massBucketsOrder = [UNKNOWN_LABEL, '< 50 kg', '50–79 kg', '80–99 kg', '100–149 kg', '≥ 150 kg'];
    const massBuckets = toBuckets(charactersItems, (c) => bucketMassKg(c.mass), massBucketsOrder);

    const homeworldValues = charactersItems.map((c) => normalizeLabel(c.homeworld?.name));
    const homeworldTop = toTopCounts(homeworldValues, 10);

    // Scatter: Height vs Mass
    const heightVsMass: ScatterDatum[] = charactersItems
      .filter((c) => c.height != null && c.mass != null && c.height > 0 && c.mass > 0)
      .map((c) => ({
        name: c.name,
        x: c.height!,
        y: c.mass!,
        z: 50,
        category: normalizeLabel(c.gender),
      }));

    // Species distribution for characters
    const speciesValues = charactersItems.flatMap((c) => 
      c.species && c.species.length > 0 
        ? c.species.map(s => normalizeLabel(s.name)) 
        : ['Humano']
    );
    const speciesDistribution = toTopCounts(speciesValues, 10);

    // ═══════════════════════════════════════════════════════════════
    // PLANETS
    // ═══════════════════════════════════════════════════════════════
    const climateValues = planetsItems.flatMap((p) => splitMulti(p.climate));
    const climateTop = toTopCounts(climateValues, 8);

    const terrainValues = planetsItems.flatMap((p) => splitMulti(p.terrain));
    const terrainTop = toTopCounts(terrainValues, 8);

    const populationBucketsOrder = [UNKNOWN_LABEL, '0', '1–999', '1K–999K', '1M–999M', '≥ 1B'];
    const populationBuckets = toBuckets(planetsItems, (p) => bucketPopulation(p.population), populationBucketsOrder);

    const diameterBucketsOrder = [UNKNOWN_LABEL, '< 5.000 km', '5K–10K km', '10K–15K km', '15K–50K km', '≥ 50.000 km'];
    const diameterBuckets = toBuckets(planetsItems, (p) => bucketDiameter(p.diameter ?? null), diameterBucketsOrder);

    const surfaceWaterBucketsOrder = [UNKNOWN_LABEL, '0%', '1–20%', '21–50%', '51–80%', '81–100%'];
    const surfaceWaterBuckets = toBuckets(planetsItems, (p) => bucketSurfaceWater(p.surface_water ?? null), surfaceWaterBucketsOrder);

    const gravityValues = planetsItems.map((p) => normalizeGravity(p.gravity));
    const gravityTypes = toTopCounts(gravityValues, 5);

    const residentsTop = planetsItems
      .filter(p => (p.residents_count ?? 0) > 0)
      .map(p => ({ name: p.name, value: p.residents_count ?? 0 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // Treemap: Climate + Terrain
    const climateTerrainMap = new Map<string, Map<string, number>>();
    planetsItems.forEach(p => {
      const climates = splitMulti(p.climate);
      const terrains = splitMulti(p.terrain);
      climates.forEach(climate => {
        if (!climateTerrainMap.has(climate)) {
          climateTerrainMap.set(climate, new Map());
        }
        terrains.forEach(terrain => {
          const terrainMap = climateTerrainMap.get(climate)!;
          terrainMap.set(terrain, (terrainMap.get(terrain) ?? 0) + 1);
        });
      });
    });
    const climateTerrainTreemap: TreemapDatum[] = Array.from(climateTerrainMap.entries())
      .slice(0, 6)
      .map(([climate, terrainMap]) => ({
        name: climate,
        value: Array.from(terrainMap.values()).reduce((a, b) => a + b, 0),
        children: Array.from(terrainMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([terrain, count]) => ({
            name: terrain,
            value: count,
            category: climate,
          })),
      }));

    // ═══════════════════════════════════════════════════════════════
    // STARSHIPS
    // ═══════════════════════════════════════════════════════════════
    const manufacturerValues = starshipsItems.flatMap((s) => splitMulti(s.manufacturer));
    const manufacturerTop = toTopCounts(manufacturerValues, 10);

    const classTop = toTopCounts(starshipsItems.map((s) => normalizeLabel(s.starship_class)), 8);
    const crewBucketsOrder = [UNKNOWN_LABEL, '0', '1–5', '6–50', '51–500', '≥ 501'];
    const crewBuckets = toBuckets(starshipsItems, (s) => bucketCrew(s.crew), crewBucketsOrder);

    const costBucketsOrder = [UNKNOWN_LABEL, '< 50K', '50K–200K', '200K–1M', '1M–100M', '≥ 100M'];
    const costBuckets = toBuckets(starshipsItems, (s) => bucketCostCredits(s.cost_in_credits ?? null), costBucketsOrder);

    const hyperdriveBucketsOrder = [UNKNOWN_LABEL, '≤ 1.0 (Rápido)', '1.1–2.0', '2.1–3.0', '3.1–4.0', '> 4.0 (Lento)'];
    const hyperdriveBuckets = toBuckets(starshipsItems, (s) => bucketHyperdrive(s.hyperdrive_rating ?? null), hyperdriveBucketsOrder);

    const lengthBucketsOrder = [UNKNOWN_LABEL, '< 20m', '20–50m', '50–150m', '150–500m', '≥ 500m'];
    const lengthBuckets = toBuckets(starshipsItems, (s) => bucketLength(s.length ?? null), lengthBucketsOrder);

    const cargoBucketsOrder = [UNKNOWN_LABEL, '< 100 kg', '100–1K kg', '1K–100K kg', '100K–10M kg', '≥ 10M kg'];
    const cargoBuckets = toBuckets(starshipsItems, (s) => bucketCargo(s.cargo_capacity ?? null), cargoBucketsOrder);

    // Scatter: Cost vs Length
    const costVsLength: ScatterDatum[] = starshipsItems
      .filter((s) => s.cost_in_credits != null && s.length != null && s.cost_in_credits > 0 && s.length > 0)
      .map((s) => ({
        name: s.name,
        x: s.length!,
        y: s.cost_in_credits!,
        z: s.crew ?? 10,
        category: normalizeLabel(s.starship_class),
      }));

    // Treemap: Manufacturer by Class
    const manufacturerClassMap = new Map<string, Map<string, number>>();
    starshipsItems.forEach(s => {
      const manufacturers = splitMulti(s.manufacturer);
      const shipClass = normalizeLabel(s.starship_class);
      manufacturers.forEach(manufacturer => {
        if (!manufacturerClassMap.has(manufacturer)) {
          manufacturerClassMap.set(manufacturer, new Map());
        }
        const classMap = manufacturerClassMap.get(manufacturer)!;
        classMap.set(shipClass, (classMap.get(shipClass) ?? 0) + 1);
      });
    });
    const manufacturerByClass: TreemapDatum[] = Array.from(manufacturerClassMap.entries())
      .map(([manufacturer, classMap]) => ({
        name: manufacturer,
        value: Array.from(classMap.values()).reduce((a, b) => a + b, 0),
        children: Array.from(classMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([shipClass, count]) => ({
            name: shipClass,
            value: count,
            category: manufacturer,
          })),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    // Radar: Top ships comparison
    const topShipsRadar: RadarDatum[] = (() => {
      const topShips = starshipsItems
        .filter(s => s.hyperdrive_rating != null && s.crew != null && s.passengers != null)
        .slice(0, 5);
      
      if (topShips.length === 0) return [];

      const maxHyperdrive = Math.max(...topShips.map(s => s.hyperdrive_rating ?? 1));
      const maxCrew = Math.max(...topShips.map(s => s.crew ?? 1));
      const maxPassengers = Math.max(...topShips.map(s => s.passengers ?? 1));
      const maxLength = Math.max(...topShips.map(s => s.length ?? 1));
      const maxCargo = Math.max(...topShips.map(s => s.cargo_capacity ?? 1));

      return [
        { subject: 'Velocidade Warp', value: topShips.reduce((acc, s) => acc + (100 - ((s.hyperdrive_rating ?? maxHyperdrive) / maxHyperdrive) * 100), 0) / topShips.length, fullMark: 100 },
        { subject: 'Tripulação', value: topShips.reduce((acc, s) => acc + ((s.crew ?? 0) / maxCrew) * 100, 0) / topShips.length, fullMark: 100 },
        { subject: 'Passageiros', value: topShips.reduce((acc, s) => acc + ((s.passengers ?? 0) / maxPassengers) * 100, 0) / topShips.length, fullMark: 100 },
        { subject: 'Comprimento', value: topShips.reduce((acc, s) => acc + ((s.length ?? 0) / maxLength) * 100, 0) / topShips.length, fullMark: 100 },
        { subject: 'Capacidade Carga', value: topShips.reduce((acc, s) => acc + ((s.cargo_capacity ?? 0) / maxCargo) * 100, 0) / topShips.length, fullMark: 100 },
      ];
    })();

    // ═══════════════════════════════════════════════════════════════
    // SPECIES
    // ═══════════════════════════════════════════════════════════════
    const classificationTop = toTopCounts(speciesItems.map((s) => normalizeLabel(s.classification)), 8);
    const designationTop = toTopCounts(speciesItems.map((s) => normalizeLabel(s.designation)), 6);
    const languageTop = toTopCounts(speciesItems.map((s) => normalizeLabel(s.language)), 10);

    const avgHeightBucketsOrder = [UNKNOWN_LABEL, '< 100 cm', '100–149 cm', '150–199 cm', '200–249 cm', '≥ 250 cm'];
    const avgHeightBuckets = toBuckets(speciesItems, (s) => bucketAvgHeight(s.average_height), avgHeightBucketsOrder);

    const avgLifespanBucketsOrder = [UNKNOWN_LABEL, '< 50 anos', '50–99 anos', '100–199 anos', '200–499 anos', '≥ 500 anos'];
    const avgLifespanBuckets = toBuckets(speciesItems, (s) => bucketAvgLifespan(s.average_lifespan), avgLifespanBucketsOrder);

    // Stacked: Classification by Designation
    const classificationByDesignation: StackedDatum[] = (() => {
      const classifications = Array.from(new Set(speciesItems.map(s => normalizeLabel(s.classification)))).slice(0, 6);
      const designations = Array.from(new Set(speciesItems.map(s => normalizeLabel(s.designation))));
      
      return classifications.map(classification => {
        const result: StackedDatum = { name: classification };
        designations.forEach(designation => {
          const count = speciesItems.filter(s => 
            normalizeLabel(s.classification) === classification && 
            normalizeLabel(s.designation) === designation
          ).length;
          if (count > 0) {
            result[designation] = count;
          }
        });
        return result;
      });
    })();

    // ═══════════════════════════════════════════════════════════════
    // VEHICLES
    // ═══════════════════════════════════════════════════════════════
    const vehicleClassTop = toTopCounts(vehiclesItems.map((v) => normalizeLabel(v.vehicle_class)), 8);
    const vehicleManufacturerValues = vehiclesItems.flatMap((v) => splitMulti(v.manufacturer));
    const vehicleManufacturerTop = toTopCounts(vehicleManufacturerValues, 10);
    
    const vehicleCrewBucketsOrder = [UNKNOWN_LABEL, '0', '1–5', '6–50', '51–500', '≥ 501'];
    const vehicleCrewBuckets = toBuckets(vehiclesItems, (v) => bucketCrew(v.crew), vehicleCrewBucketsOrder);

    const vehiclePassengersBucketsOrder = [UNKNOWN_LABEL, '0', '1–10', '11–100', '101–1000', '≥ 1001'];
    const vehiclePassengersBuckets = toBuckets(vehiclesItems, (v) => bucketPassengers(v.passengers), vehiclePassengersBucketsOrder);

    // ═══════════════════════════════════════════════════════════════
    // FILMS
    // ═══════════════════════════════════════════════════════════════
    const byDirector = toTopCounts(filmsItems.map((f) => normalizeLabel(f.director)), 8);
    const byYear = toTopCounts(filmsItems.map((f) => yearFromDate(f.release_date)), 10).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    const filmsPreview = filmsItems.slice(0, 6).map((f) => ({
      id: f.id,
      title: f.title,
      episode_id: f.episode_id,
      release_date: f.release_date,
      director: f.director,
      producer: f.producer,
      characters_count: f.characters_count,
      planets_count: f.planets_count,
      starships_count: f.starships_count,
      vehicles_count: f.vehicles_count,
      species_count: f.species_count,
    }));

    // Stacked: Entities per Film
    const entitiesPerFilm: StackedDatum[] = filmsItems.map(f => ({
      name: `Ep. ${f.episode_id}`,
      Personagens: f.characters_count ?? 0,
      Planetas: f.planets_count ?? 0,
      Naves: f.starships_count ?? 0,
      Veículos: f.vehicles_count ?? 0,
      Espécies: f.species_count ?? 0,
    }));

    // Radar: Timeline radar showing film scope
    const timelineRadar: RadarDatum[] = filmsItems.slice(0, 6).map(f => ({
      subject: `Ep. ${f.episode_id}`,
      value: (f.characters_count ?? 0) + (f.planets_count ?? 0) + (f.starships_count ?? 0),
      fullMark: 100,
    }));

    // ═══════════════════════════════════════════════════════════════
    // CROSS ANALYTICS
    // ═══════════════════════════════════════════════════════════════
    const entitiesSummary: RadarDatum[] = [
      { subject: 'Personagens', value: characters.meta.total, fullMark: 100 },
      { subject: 'Planetas', value: planets.meta.total, fullMark: 100 },
      { subject: 'Naves', value: starships.meta.total, fullMark: 100 },
      { subject: 'Espécies', value: species.meta.total, fullMark: 100 },
      { subject: 'Veículos', value: vehicles.meta.total, fullMark: 100 },
      { subject: 'Filmes', value: films.meta.total, fullMark: 100 },
    ];

    const uniqueLanguagesSet = new Set(speciesItems.map(s => normalizeLabel(s.language)).filter(l => l !== UNKNOWN_LABEL));
    const uniqueManufacturersSet = new Set([
      ...starshipsItems.flatMap(s => splitMulti(s.manufacturer)),
      ...vehiclesItems.flatMap(v => splitMulti(v.manufacturer)),
    ].filter(m => m !== UNKNOWN_LABEL));

    const diversityScore = Math.round(
      (uniqueLanguagesSet.size * 2) + 
      (uniqueManufacturersSet.size) + 
      (speciesItems.length * 3) +
      (new Set(planetsItems.flatMap(p => splitMulti(p.climate))).size)
    );

    const avgCharactersPerFilm = filmsItems.length > 0 
      ? Math.round(filmsItems.reduce((acc, f) => acc + (f.characters_count ?? 0), 0) / filmsItems.length)
      : 0;

    const avgPlanetsPerFilm = filmsItems.length > 0
      ? Math.round(filmsItems.reduce((acc, f) => acc + (f.planets_count ?? 0), 0) / filmsItems.length)
      : 0;

    // ═══════════════════════════════════════════════════════════════
    // GAMIFICATION
    // ═══════════════════════════════════════════════════════════════
    const achievementsUnlocked = achievements.filter((a) => a.unlocked).length;
    const achievementsLocked = Math.max(0, achievements.length - achievementsUnlocked);

    const achievementsRewardsTop = achievements
      .slice()
      .sort((a, b) => b.xp_reward - a.xp_reward)
      .slice(0, 8)
      .map((a) => ({ name: a.name, value: a.xp_reward }));

    const leaderboardTop = leaderboard.map((l) => ({ user_id: l.user_id, total_xp: l.total_xp }));

    return {
      totals: {
        characters: characters.meta.total,
        planets: planets.meta.total,
        starships: starships.meta.total,
        films: films.meta.total,
        species: species.meta.total,
        vehicles: vehicles.meta.total,
      },
      characters: {
        gender,
        heightBuckets,
        hairColorsTop,
        eyeColorsTop,
        skinColorsTop,
        massBuckets,
        homeworldTop,
        heightVsMass,
        speciesDistribution,
      },
      planets: {
        climateTop,
        terrainTop,
        populationBuckets,
        diameterBuckets,
        surfaceWaterBuckets,
        gravityTypes,
        residentsTop,
        climateTerrainTreemap,
      },
      starships: {
        manufacturerTop,
        classTop,
        crewBuckets,
        costBuckets,
        hyperdriveBuckets,
        lengthBuckets,
        cargoBuckets,
        costVsLength,
        manufacturerByClass,
        topShipsRadar,
      },
      species: {
        classificationTop,
        designationTop,
        languageTop,
        avgHeightBuckets,
        avgLifespanBuckets,
        classificationByDesignation,
      },
      vehicles: {
        classTop: vehicleClassTop,
        manufacturerTop: vehicleManufacturerTop,
        crewBuckets: vehicleCrewBuckets,
        passengersBuckets: vehiclePassengersBuckets,
      },
      films: {
        byDirector,
        byYear,
        preview: filmsPreview,
        entitiesPerFilm,
        timelineRadar,
      },
      crossAnalytics: {
        entitiesSummary,
        diversityScore,
        avgCharactersPerFilm,
        avgPlanetsPerFilm,
        uniqueLanguages: uniqueLanguagesSet.size,
        uniqueManufacturers: uniqueManufacturersSet.size,
      },
      gamification: {
        totalXp: profile.total_xp,
        jediRank: profile.jedi_rank,
        totalQueries: profile.total_queries,
        chatMessages: profile.chat_messages,
        achievementsUnlocked,
        achievementsLocked,
        achievementsRewardsTop,
        leaderboardTop,
        dailyChallenge: {
          title: dailyChallenge.title,
          xp_reward: dailyChallenge.xp_reward,
          completed: dailyChallenge.completed,
          progress_current: dailyChallenge.progress_current ?? null,
          progress_target: dailyChallenge.progress_target ?? null,
        },
      },
    };
  }, [snapshotQuery.data]);

  const achievementsDonut = useMemo<ChartDatum[]>(
    () =>
      report
        ? [
          { name: 'Desbloqueadas', value: report.gamification.achievementsUnlocked },
          { name: 'Bloqueadas', value: report.gamification.achievementsLocked },
        ]
        : [],
    [report]
  );

  const chatVsQueries = useMemo<ChartDatum[]>(
    () =>
      report
        ? [
          { name: 'Consultas', value: report.gamification.totalQueries },
          { name: 'Mensagens no chat', value: report.gamification.chatMessages },
        ]
        : [],
    [report]
  );

  const leaderboardData = useMemo<ChartDatum[]>(
    () =>
      report
        ? report.gamification.leaderboardTop.map((entry) => ({ name: entry.user_id, value: entry.total_xp }))
        : [],
    [report]
  );

  const challengeProgress = useMemo(() => {
    const current = report?.gamification.dailyChallenge?.progress_current ?? null;
    const target = report?.gamification.dailyChallenge?.progress_target ?? null;
    if (current == null || target == null || target <= 0) return null;
    const ratio = Math.max(0, Math.min(1, current / target));
    return { current, target, ratio };
  }, [report]);

  return {
    snapshotQuery,
    report,
    achievementsDonut,
    chatVsQueries,
    leaderboard: leaderboardData,
    challengeProgress,
  };
}
