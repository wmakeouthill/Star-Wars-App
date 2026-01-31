import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCharacters } from '@/features/characters/services/characters.service';
import { fetchFilms } from '@/features/films/services/films.service';
import { fetchPlanets } from '@/features/planets/services/planets.service';
import { fetchStarships } from '@/features/starships/services/starships.service';
import {
  fetchDailyChallenge,
  fetchGamificationAchievements,
  fetchGamificationLeaderboard,
  fetchGamificationProfile,
} from '@/features/gamification/services/gamification.service';
import type { Character } from '@/features/characters/types/characters.types';
import type { Film } from '@/features/films/types/films.types';
import type { Planet } from '@/features/planets/types/planets.types';
import type { Starship } from '@/features/starships/types/starships.types';
import type { AchievementStatus, DailyChallenge, LeaderboardEntry, UserGamification } from '@/features/gamification/types/gamification.types';
import type { PaginatedResponse } from '@/shared/types/common.types';
import type { ChartDatum } from '@/features/reports/types/reports.types';
import type { ReportsSnapshot } from './ReportsPage.types';

const REPORTS_PAGE_SIZE = 100;
const UNKNOWN_LABEL = 'Desconhecido';
const OTHER_LABEL = 'Outros';

function normalizeLabel(value: string | null | undefined): string {
  const raw = (value ?? '').trim();
  if (!raw) return UNKNOWN_LABEL;
  const lower = raw.toLowerCase();
  if (lower === 'unknown' || lower === 'n/a' || lower === 'none') return UNKNOWN_LABEL;
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

function bucketPopulation(population: number | null): string {
  if (population == null) return UNKNOWN_LABEL;
  if (population === 0) return '0';
  if (population < 1_000) return '1–999';
  if (population < 1_000_000) return '1K–999K';
  if (population < 1_000_000_000) return '1M–999M';
  return '≥ 1B';
}

function bucketCrew(crew: number | null): string {
  if (crew == null) return UNKNOWN_LABEL;
  if (crew === 0) return '0';
  if (crew <= 5) return '1–5';
  if (crew <= 50) return '6–50';
  if (crew <= 500) return '51–500';
  return '≥ 501';
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

async function fetchReportsSnapshot(): Promise<{
  characters: PaginatedResponse<Character>;
  planets: PaginatedResponse<Planet>;
  starships: PaginatedResponse<Starship>;
  films: PaginatedResponse<Film>;
  profile: UserGamification;
  achievements: AchievementStatus[];
  leaderboard: LeaderboardEntry[];
  dailyChallenge: DailyChallenge;
}> {
  const [characters, planets, starships, films, profile, achievements, leaderboard, dailyChallenge] =
    await Promise.all([
      fetchCharacters({ page: 1, pageSize: REPORTS_PAGE_SIZE, sortBy: 'name', sortOrder: 'asc' }),
      fetchPlanets({ page: 1, pageSize: REPORTS_PAGE_SIZE, sortBy: 'name', sortOrder: 'asc' }),
      fetchStarships({ page: 1, pageSize: REPORTS_PAGE_SIZE, sortBy: 'name', sortOrder: 'asc' }),
      fetchFilms({ page: 1, pageSize: REPORTS_PAGE_SIZE, sortBy: 'episode_id', sortOrder: 'asc' }),
      fetchGamificationProfile(),
      fetchGamificationAchievements(),
      fetchGamificationLeaderboard(10),
      fetchDailyChallenge(),
    ]);

  return { characters, planets, starships, films, profile, achievements, leaderboard, dailyChallenge };
}

export function useReportsPage() {
  const snapshotQuery = useQuery({
    queryKey: ['reports', 'snapshot'],
    queryFn: fetchReportsSnapshot,
    staleTime: 1000 * 60,
  });

  const report = useMemo<ReportsSnapshot | null>(() => {
    if (!snapshotQuery.data) return null;

    const { characters, planets, starships, films, profile, achievements, leaderboard, dailyChallenge } =
      snapshotQuery.data;

    const charactersItems = characters.items ?? [];
    const planetsItems = planets.items ?? [];
    const starshipsItems = starships.items ?? [];
    const filmsItems = films.items ?? [];

    const gender = toTopCounts(charactersItems.map((c) => normalizeLabel(c.gender)), 6);
    const heightBucketsOrder = [UNKNOWN_LABEL, '< 100 cm', '100–149 cm', '150–179 cm', '180–199 cm', '≥ 200 cm'];
    const heightBuckets = toBuckets(charactersItems, (c) => bucketHeightCm(c.height), heightBucketsOrder);

    const hairValues = charactersItems.flatMap((c) => splitMulti(c.hair_color));
    const hairColorsTop = toTopCounts(hairValues, 8);

    const climateValues = planetsItems.flatMap((p) => splitMulti(p.climate));
    const climateTop = toTopCounts(climateValues, 8);

    const terrainValues = planetsItems.flatMap((p) => splitMulti(p.terrain));
    const terrainTop = toTopCounts(terrainValues, 8);

    const populationBucketsOrder = [UNKNOWN_LABEL, '0', '1–999', '1K–999K', '1M–999M', '≥ 1B'];
    const populationBuckets = toBuckets(planetsItems, (p) => bucketPopulation(p.population), populationBucketsOrder);

    const manufacturerValues = starshipsItems.flatMap((s) => splitMulti(s.manufacturer));
    const manufacturerTop = toTopCounts(manufacturerValues, 10);

    const classTop = toTopCounts(starshipsItems.map((s) => normalizeLabel(s.starship_class)), 8);
    const crewBucketsOrder = [UNKNOWN_LABEL, '0', '1–5', '6–50', '51–500', '≥ 501'];
    const crewBuckets = toBuckets(starshipsItems, (s) => bucketCrew(s.crew), crewBucketsOrder);

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
    }));

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
      },
      characters: {
        gender,
        heightBuckets,
        hairColorsTop,
      },
      planets: {
        climateTop,
        terrainTop,
        populationBuckets,
      },
      starships: {
        manufacturerTop,
        classTop,
        crewBuckets,
      },
      films: {
        byDirector,
        byYear,
        preview: filmsPreview,
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

  const leaderboard = useMemo<ChartDatum[]>(
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
    leaderboard,
    challengeProgress,
  };
}

