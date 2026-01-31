import type { ChartDatum } from '@/features/reports/types/reports.types';

export interface ReportsSnapshot {
  totals: {
    characters: number;
    planets: number;
    starships: number;
    films: number;
  };
  characters: {
    gender: ChartDatum[];
    heightBuckets: ChartDatum[];
    hairColorsTop: ChartDatum[];
  };
  planets: {
    climateTop: ChartDatum[];
    terrainTop: ChartDatum[];
    populationBuckets: ChartDatum[];
  };
  starships: {
    manufacturerTop: ChartDatum[];
    classTop: ChartDatum[];
    crewBuckets: ChartDatum[];
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
    }>;
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

