import type { ChartDatum, ScatterDatum, RadarDatum, TreemapDatum, StackedDatum } from '@/features/reports/types/reports.types';

export interface ReportsSnapshot {
  totals: {
    characters: number;
    planets: number;
    starships: number;
    films: number;
    species: number;
    vehicles: number;
  };
  characters: {
    gender: ChartDatum[];
    heightBuckets: ChartDatum[];
    hairColorsTop: ChartDatum[];
    eyeColorsTop: ChartDatum[];
    skinColorsTop: ChartDatum[];
    massBuckets: ChartDatum[];
    homeworldTop: ChartDatum[];
    heightVsMass: ScatterDatum[];
    speciesDistribution: ChartDatum[];
  };
  planets: {
    climateTop: ChartDatum[];
    terrainTop: ChartDatum[];
    populationBuckets: ChartDatum[];
    diameterBuckets: ChartDatum[];
    surfaceWaterBuckets: ChartDatum[];
    gravityTypes: ChartDatum[];
    residentsTop: ChartDatum[];
    climateTerrainTreemap: TreemapDatum[];
  };
  starships: {
    manufacturerTop: ChartDatum[];
    classTop: ChartDatum[];
    crewBuckets: ChartDatum[];
    costBuckets: ChartDatum[];
    hyperdriveBuckets: ChartDatum[];
    lengthBuckets: ChartDatum[];
    cargoBuckets: ChartDatum[];
    costVsLength: ScatterDatum[];
    manufacturerByClass: TreemapDatum[];
    topShipsRadar: RadarDatum[];
  };
  species: {
    classificationTop: ChartDatum[];
    designationTop: ChartDatum[];
    languageTop: ChartDatum[];
    avgHeightBuckets: ChartDatum[];
    avgLifespanBuckets: ChartDatum[];
    classificationByDesignation: StackedDatum[];
  };
  vehicles: {
    classTop: ChartDatum[];
    manufacturerTop: ChartDatum[];
    crewBuckets: ChartDatum[];
    passengersBuckets: ChartDatum[];
  };
  films: {
    byDirector: ChartDatum[];
    byYear: ChartDatum[];
    preview: Array<{
      id: string;
      title: string;
      episode_id: number;
      release_date: string;
      director: string;
      producer: string;
      characters_count?: number;
      planets_count?: number;
      starships_count?: number;
      vehicles_count?: number;
      species_count?: number;
    }>;
    entitiesPerFilm: StackedDatum[];
    timelineRadar: RadarDatum[];
  };
  crossAnalytics: {
    entitiesSummary: RadarDatum[];
    diversityScore: number;
    avgCharactersPerFilm: number;
    avgPlanetsPerFilm: number;
    uniqueLanguages: number;
    uniqueManufacturers: number;
  };
  gamification: {
    totalXp: number;
    jediRank: string;
    totalQueries: number;
    chatMessages: number;
    achievementsUnlocked: number;
    achievementsLocked: number;
    achievementsRewardsTop: ChartDatum[];
    leaderboardTop: { user_id: string; total_xp: number }[];
    dailyChallenge?: {
      title: string;
      xp_reward: number;
      completed: boolean;
      progress_current?: number | null;
      progress_target?: number | null;
    };
  };
}

