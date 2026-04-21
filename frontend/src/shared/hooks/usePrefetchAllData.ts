import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { fetchCharacters } from '@/features/characters/services/characters.service';
import { fetchFilms } from '@/features/films/services/films.service';
import { fetchPlanets } from '@/features/planets/services/planets.service';
import { fetchSpecies } from '@/features/species/services/species.service';
import { fetchStarships } from '@/features/starships/services/starships.service';
import { fetchVehicles } from '@/features/vehicles/services/vehicles.service';
import {
  fetchGamificationProfile,
  fetchGamificationAchievements,
  fetchGamificationLeaderboard,
  fetchDailyChallenge,
  fetchChatStatsByPersona,
} from '@/features/gamification/services/gamification.service';
import type { PaginatedResponse } from '@/shared/types/common.types';

const STALE_TIME = 1000 * 60 * 5;
const REPORTS_STALE_TIME = 1000 * 60 * 60 * 24;

const PAGE_SIZES = {
  LIST_PAGE: 12,
  FILMS_PAGE: 8,
  DASHBOARD: 6,
  REPORTS: 100,
  QUIZ_BULK: 50,
};

type FetchFn<T> = (filters: Record<string, unknown>) => Promise<PaginatedResponse<T>>;

type IdleDeadline = { didTimeout: boolean; timeRemaining: () => number };
type IdleCallback = (deadline: IdleDeadline) => void;

const runWhenIdle = (cb: IdleCallback, timeout = 2000) => {
  const w = window as unknown as {
    requestIdleCallback?: (cb: IdleCallback, opts?: { timeout: number }) => number;
  };
  if (typeof w.requestIdleCallback === 'function') {
    return w.requestIdleCallback(cb, { timeout });
  }
  return window.setTimeout(() => cb({ didTimeout: true, timeRemaining: () => 0 }), 200);
};

async function prefetchPages<T>(
  queryClient: ReturnType<typeof useQueryClient>,
  queryKeyPrefix: string,
  fetchFn: FetchFn<T>,
  filters: Record<string, unknown>,
  maxPages: number
) {
  const firstPageData = await queryClient.fetchQuery({
    queryKey: [queryKeyPrefix, filters],
    queryFn: () => fetchFn(filters),
    staleTime: STALE_TIME,
  });

  const totalPages = firstPageData?.meta?.total_pages ?? 1;
  const pagesToFetch = Math.min(totalPages, maxPages);

  if (pagesToFetch > 1) {
    const additionalPages = Array.from({ length: pagesToFetch - 1 }, (_, i) => i + 2);
    await Promise.allSettled(
      additionalPages.map((page) => {
        const pageFilters = { ...filters, page };
        return queryClient.prefetchQuery({
          queryKey: [queryKeyPrefix, pageFilters],
          queryFn: () => fetchFn(pageFilters),
          staleTime: STALE_TIME,
        });
      })
    );
  }

  return firstPageData;
}

interface UsePrefetchAllDataOptions {
  enabled?: boolean;
}

/**
 * Prefetch escalonado e não-bloqueante:
 * - Fase 1 (Dashboard): apenas pageSize 6. Disparado no próximo idle, sem await de bloqueio.
 * - Fases 2–6: rodam em sequência via requestIdleCallback, só avançam se a anterior teve sucesso.
 * - Qualquer falha de rede (ex: backend em 503) aborta o pipeline silenciosamente.
 */
export function usePrefetchAllData(options: UsePrefetchAllDataOptions = {}) {
  const { enabled = true } = options;
  const queryClient = useQueryClient();
  const hasPrefetched = useRef(false);
  const abortedRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      hasPrefetched.current = false;
      abortedRef.current = true;
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    if (hasPrefetched.current) return;
    hasPrefetched.current = true;
    abortedRef.current = false;

    const qc = queryClient;

    const runSettledOrAbort = async (promises: Promise<unknown>[]) => {
      const results = await Promise.allSettled(promises);
      const allFailed = results.length > 0 && results.every((r) => r.status === 'rejected');
      if (allFailed) abortedRef.current = true;
      return !abortedRef.current;
    };

    const phase1Dashboard = () => {
      const size = PAGE_SIZES.DASHBOARD;
      const charFilters = { name: undefined, gender: undefined, filmId: undefined, page: 1, pageSize: size, sortBy: 'name' as const, sortOrder: 'asc' as const };
      const planetFilters = { name: undefined, climate: undefined, page: 1, pageSize: size, sortBy: 'name' as const, sortOrder: 'asc' as const };
      const starshipFilters = { name: undefined, manufacturer: undefined, page: 1, pageSize: size, sortBy: 'name' as const, sortOrder: 'asc' as const };
      const vehicleFilters = { name: undefined, manufacturer: undefined, vehicleClass: undefined, page: 1, pageSize: size, sortBy: 'name' as const, sortOrder: 'asc' as const };
      const speciesFilters = { name: undefined, classification: undefined, language: undefined, page: 1, pageSize: size, sortBy: 'name' as const, sortOrder: 'asc' as const };
      const filmFilters = { title: undefined, director: undefined, page: 1, pageSize: size, sortBy: 'episode_id' as const, sortOrder: 'asc' as const };

      return runSettledOrAbort([
        qc.prefetchQuery({ queryKey: ['characters', charFilters], queryFn: () => fetchCharacters(charFilters), staleTime: STALE_TIME }),
        qc.prefetchQuery({ queryKey: ['planets', planetFilters], queryFn: () => fetchPlanets(planetFilters), staleTime: STALE_TIME }),
        qc.prefetchQuery({ queryKey: ['starships', starshipFilters], queryFn: () => fetchStarships(starshipFilters), staleTime: STALE_TIME }),
        qc.prefetchQuery({ queryKey: ['vehicles', vehicleFilters], queryFn: () => fetchVehicles(vehicleFilters), staleTime: STALE_TIME }),
        qc.prefetchQuery({ queryKey: ['species', speciesFilters], queryFn: () => fetchSpecies(speciesFilters), staleTime: STALE_TIME }),
        qc.prefetchQuery({ queryKey: ['films', filmFilters], queryFn: () => fetchFilms(filmFilters), staleTime: STALE_TIME }),
      ]);
    };

    const phase2ListPages = () => {
      const charactersListFilters = { name: undefined, gender: undefined, filmId: undefined, page: 1, pageSize: PAGE_SIZES.LIST_PAGE, sortBy: 'name' as const, sortOrder: 'asc' as const };
      const planetsListFilters = { name: undefined, climate: undefined, page: 1, pageSize: PAGE_SIZES.LIST_PAGE, sortBy: 'name' as const, sortOrder: 'asc' as const };
      const starshipsListFilters = { name: undefined, manufacturer: undefined, page: 1, pageSize: PAGE_SIZES.LIST_PAGE, sortBy: 'name' as const, sortOrder: 'asc' as const };
      const vehiclesListFilters = { name: undefined, manufacturer: undefined, vehicleClass: undefined, page: 1, pageSize: PAGE_SIZES.LIST_PAGE, sortBy: 'name' as const, sortOrder: 'asc' as const };
      const speciesListFilters = { name: undefined, classification: undefined, language: undefined, page: 1, pageSize: PAGE_SIZES.LIST_PAGE, sortBy: 'name' as const, sortOrder: 'asc' as const };
      const filmsListFilters = { title: undefined, director: undefined, page: 1, pageSize: PAGE_SIZES.LIST_PAGE, sortBy: 'episode_id' as const, sortOrder: 'asc' as const };

      return runSettledOrAbort([
        prefetchPages(qc, 'characters', fetchCharacters, charactersListFilters, 1),
        prefetchPages(qc, 'planets', fetchPlanets, planetsListFilters, 1),
        prefetchPages(qc, 'starships', fetchStarships, starshipsListFilters, 1),
        prefetchPages(qc, 'vehicles', fetchVehicles, vehiclesListFilters, 1),
        prefetchPages(qc, 'species', fetchSpecies, speciesListFilters, 1),
        prefetchPages(qc, 'films', fetchFilms, filmsListFilters, 1),
      ]);
    };

    const phase3Films = () => {
      const filmsPageFilters = { title: undefined, director: undefined, page: 1, pageSize: PAGE_SIZES.FILMS_PAGE, sortBy: 'episode_id' as const, sortOrder: 'asc' as const };
      return runSettledOrAbort([
        qc.prefetchQuery({ queryKey: ['films', filmsPageFilters], queryFn: () => fetchFilms(filmsPageFilters), staleTime: STALE_TIME }),
      ]);
    };

    const phase4Reports = () => {
      const reportsCharacters = { page: 1, pageSize: PAGE_SIZES.REPORTS, sortBy: 'name' as const, sortOrder: 'asc' as const };
      const reportsPlanets = { page: 1, pageSize: PAGE_SIZES.REPORTS, sortBy: 'name' as const, sortOrder: 'asc' as const };
      const reportsStarships = { page: 1, pageSize: PAGE_SIZES.REPORTS, sortBy: 'name' as const, sortOrder: 'asc' as const };
      const reportsVehicles = { page: 1, pageSize: PAGE_SIZES.REPORTS, sortBy: 'name' as const, sortOrder: 'asc' as const };
      const reportsSpecies = { page: 1, pageSize: PAGE_SIZES.REPORTS, sortBy: 'name' as const, sortOrder: 'asc' as const };
      const reportsFilms = { page: 1, pageSize: PAGE_SIZES.REPORTS, sortBy: 'episode_id' as const, sortOrder: 'asc' as const };

      return runSettledOrAbort([
        qc.prefetchQuery({ queryKey: ['reports', 'characters'], queryFn: () => fetchCharacters(reportsCharacters), staleTime: REPORTS_STALE_TIME }),
        qc.prefetchQuery({ queryKey: ['reports', 'planets'], queryFn: () => fetchPlanets(reportsPlanets), staleTime: REPORTS_STALE_TIME }),
        qc.prefetchQuery({ queryKey: ['reports', 'starships'], queryFn: () => fetchStarships(reportsStarships), staleTime: REPORTS_STALE_TIME }),
        qc.prefetchQuery({ queryKey: ['reports', 'vehicles'], queryFn: () => fetchVehicles(reportsVehicles), staleTime: REPORTS_STALE_TIME }),
        qc.prefetchQuery({ queryKey: ['reports', 'species'], queryFn: () => fetchSpecies(reportsSpecies), staleTime: REPORTS_STALE_TIME }),
        qc.prefetchQuery({ queryKey: ['reports', 'films'], queryFn: () => fetchFilms(reportsFilms), staleTime: REPORTS_STALE_TIME }),
      ]);
    };

    const phase5Gamification = () => {
      return runSettledOrAbort([
        qc.prefetchQuery({ queryKey: ['gamification', 'profile'], queryFn: fetchGamificationProfile, staleTime: STALE_TIME }),
        qc.prefetchQuery({ queryKey: ['gamification', 'achievements'], queryFn: fetchGamificationAchievements, staleTime: STALE_TIME }),
        qc.prefetchQuery({ queryKey: ['gamification', 'leaderboard', 10], queryFn: () => fetchGamificationLeaderboard(10), staleTime: STALE_TIME }),
        qc.prefetchQuery({ queryKey: ['gamification', 'daily-challenge'], queryFn: fetchDailyChallenge, staleTime: STALE_TIME }),
        qc.prefetchQuery({ queryKey: ['gamification', 'chat-stats'], queryFn: () => fetchChatStatsByPersona().catch(() => ({ yoda_messages: 0, vader_messages: 0, total_messages: 0 })), staleTime: STALE_TIME }),
      ]);
    };

    const phase6QuizBulk = () => {
      const quizCharacters = { page: 1, pageSize: PAGE_SIZES.QUIZ_BULK, sortBy: 'name' as const, sortOrder: 'asc' as const };
      const quizPlanets = { page: 1, pageSize: PAGE_SIZES.QUIZ_BULK, sortBy: 'name' as const, sortOrder: 'asc' as const };
      const quizStarships = { page: 1, pageSize: PAGE_SIZES.QUIZ_BULK, sortBy: 'name' as const, sortOrder: 'asc' as const };
      const quizVehicles = { page: 1, pageSize: PAGE_SIZES.QUIZ_BULK, sortBy: 'name' as const, sortOrder: 'asc' as const };
      const quizSpecies = { page: 1, pageSize: PAGE_SIZES.QUIZ_BULK, sortBy: 'name' as const, sortOrder: 'asc' as const };
      const quizFilms = { page: 1, pageSize: PAGE_SIZES.QUIZ_BULK, sortBy: 'episode_id' as const, sortOrder: 'asc' as const };

      return runSettledOrAbort([
        prefetchPages(qc, 'characters', fetchCharacters, quizCharacters, 1),
        prefetchPages(qc, 'planets', fetchPlanets, quizPlanets, 1),
        prefetchPages(qc, 'starships', fetchStarships, quizStarships, 1),
        prefetchPages(qc, 'vehicles', fetchVehicles, quizVehicles, 1),
        prefetchPages(qc, 'species', fetchSpecies, quizSpecies, 1),
        prefetchPages(qc, 'films', fetchFilms, quizFilms, 1),
      ]);
    };

    const phases = [phase1Dashboard, phase2ListPages, phase3Films, phase4Reports, phase5Gamification, phase6QuizBulk];

    const runNextPhase = (index: number) => {
      if (abortedRef.current) return;
      if (index >= phases.length) return;

      runWhenIdle(async () => {
        if (abortedRef.current) return;
        const ok = await phases[index]();
        if (ok) runNextPhase(index + 1);
      });
    };

    runNextPhase(0);

    return () => {
      abortedRef.current = true;
    };
  }, [enabled, queryClient]);
}
