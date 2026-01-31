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
} from '@/features/gamification/services/gamification.service';
import type { PaginatedResponse } from '@/shared/types/common.types';

/**
 * Tempo de cache padrão (5 minutos)
 */
const STALE_TIME = 1000 * 60 * 5;

/**
 * Page sizes usados nas diferentes páginas do app
 */
const PAGE_SIZES = {
  /** Usado nas páginas de listagem (CharactersPage, PlanetsPage, StarshipsPage, VehiclesPage, SpeciesPage) */
  LIST_PAGE: 12,
  /** Usado na FilmsPage */
  FILMS_PAGE: 8,
  /** Usado no Dashboard (varia, mas começa com 4-6) */
  DASHBOARD: 4,
  /** Usado na ReportsPage */
  REPORTS: 100,
  /** Usado para carregar mais dados para o quiz */
  QUIZ_BULK: 50,
};

type FetchFn<T> = (filters: Record<string, unknown>) => Promise<PaginatedResponse<T>>;

/**
 * Prefetch múltiplas páginas de uma categoria.
 */
async function prefetchPages<T>(
  queryClient: ReturnType<typeof useQueryClient>,
  queryKeyPrefix: string,
  fetchFn: FetchFn<T>,
  filters: Record<string, unknown>,
  maxPages: number
) {
  // Busca a primeira página para descobrir total_pages
  const firstPageData = await queryClient.fetchQuery({
    queryKey: [queryKeyPrefix, filters],
    queryFn: () => fetchFn(filters),
    staleTime: STALE_TIME,
  });

  const totalPages = firstPageData?.meta?.total_pages ?? 1;
  const pagesToFetch = Math.min(totalPages, maxPages);

  // Busca páginas adicionais se houver
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

/**
 * Hook que faz prefetch de todos os dados necessários para o aplicativo
 * funcionar de forma fluida em TODAS as páginas.
 * 
 * Estratégia em 6 fases:
 * 
 * 1. **Páginas de listagem** (Characters, Planets, Starships, Vehicles, Species):
 *    Prefetch com pageSize: 12 e filtros padrão. Primeiras 3 páginas de cada.
 * 
 * 2. **Dashboard (Central)**: Prefetch com pageSize dinâmico (4, 5, 6).
 * 
 * 3. **FilmsPage**: Prefetch com pageSize: 8.
 * 
 * 4. **ReportsPage (Relatórios)**: Prefetch com queryKey ['reports', categoria]
 *    e pageSize: 100 para gráficos completos. Cache de 24h (dados estáticos).
 * 
 * 5. **GamificationPage**: Prefetch de profile, achievements, leaderboard e daily-challenge.
 * 
 * 6. **Quiz (bulk)**: Prefetch com pageSize: 50 para variedade de perguntas.
 * 
 * Cobertura completa:
 * - ✅ Central (Dashboard)
 * - ✅ Relatórios
 * - ✅ Personagens
 * - ✅ Planetas  
 * - ✅ Naves
 * - ✅ Veículos
 * - ✅ Espécies
 * - ✅ Filmes
 * - ✅ Gamificação (incluindo Quiz)
 */
export function usePrefetchAllData() {
  const queryClient = useQueryClient();
  const hasPrefetched = useRef(false);

  useEffect(() => {
    // Evita múltiplas execuções
    if (hasPrefetched.current) return;
    hasPrefetched.current = true;

    const prefetchAll = async () => {
      // ===== FASE 1 (PRIORITÁRIA): Dashboard - página inicial =====
      // Carrega PRIMEIRO os dados do Dashboard para que apareça instantâneo
      // O Dashboard usa pageSize dinâmico (4-6 dependendo da tela)
      
      const dashboardPageSizes = [4, 5, 6];
      const dashboardPromises: Promise<unknown>[] = [];
      
      for (const dashboardPageSize of dashboardPageSizes) {
        // Filtros específicos para cada tipo para garantir tipos corretos
        const charFilters = { name: undefined, gender: undefined, filmId: undefined, page: 1, pageSize: dashboardPageSize, sortBy: 'name' as const, sortOrder: 'asc' as const };
        const planetFilters = { name: undefined, climate: undefined, page: 1, pageSize: dashboardPageSize, sortBy: 'name' as const, sortOrder: 'asc' as const };
        const starshipFilters = { name: undefined, manufacturer: undefined, page: 1, pageSize: dashboardPageSize, sortBy: 'name' as const, sortOrder: 'asc' as const };
        const vehicleFilters = { name: undefined, manufacturer: undefined, vehicleClass: undefined, page: 1, pageSize: dashboardPageSize, sortBy: 'name' as const, sortOrder: 'asc' as const };
        const speciesFilters = { name: undefined, classification: undefined, language: undefined, page: 1, pageSize: dashboardPageSize, sortBy: 'name' as const, sortOrder: 'asc' as const };
        const filmFilters = { title: undefined, director: undefined, page: 1, pageSize: dashboardPageSize, sortBy: 'episode_id' as const, sortOrder: 'asc' as const };

        dashboardPromises.push(
          queryClient.prefetchQuery({ queryKey: ['characters', charFilters], queryFn: () => fetchCharacters(charFilters), staleTime: STALE_TIME }),
          queryClient.prefetchQuery({ queryKey: ['planets', planetFilters], queryFn: () => fetchPlanets(planetFilters), staleTime: STALE_TIME }),
          queryClient.prefetchQuery({ queryKey: ['starships', starshipFilters], queryFn: () => fetchStarships(starshipFilters), staleTime: STALE_TIME }),
          queryClient.prefetchQuery({ queryKey: ['vehicles', vehicleFilters], queryFn: () => fetchVehicles(vehicleFilters), staleTime: STALE_TIME }),
          queryClient.prefetchQuery({ queryKey: ['species', speciesFilters], queryFn: () => fetchSpecies(speciesFilters), staleTime: STALE_TIME }),
          queryClient.prefetchQuery({ queryKey: ['films', filmFilters], queryFn: () => fetchFilms(filmFilters), staleTime: STALE_TIME }),
        );
      }

      // Aguarda APENAS o Dashboard (página inicial) - resto vai em background
      await Promise.allSettled(dashboardPromises);

      if (import.meta.env.DEV) {
        console.log('[Prefetch] ✅ Fase 1: Dashboard carregado! Iniciando background fetch...');
      }

      // ===== A PARTIR DAQUI: TUDO EM BACKGROUND (não bloqueia a UI) =====
      // Usamos setTimeout para liberar a thread principal
      setTimeout(() => prefetchBackground(queryClient), 0);
    };

    // Função separada para evitar nesting excessivo
    async function prefetchBackground(qc: ReturnType<typeof useQueryClient>) {
      const REPORTS_STALE_TIME = 1000 * 60 * 60 * 24; // 24 horas

      // ===== FASE 2 (BACKGROUND): Páginas de listagem =====
      const charactersListFilters = { name: undefined, gender: undefined, filmId: undefined, page: 1, pageSize: PAGE_SIZES.LIST_PAGE, sortBy: 'name' as const, sortOrder: 'asc' as const };
      const planetsListFilters = { name: undefined, climate: undefined, page: 1, pageSize: PAGE_SIZES.LIST_PAGE, sortBy: 'name' as const, sortOrder: 'asc' as const };
      const starshipsListFilters = { name: undefined, manufacturer: undefined, page: 1, pageSize: PAGE_SIZES.LIST_PAGE, sortBy: 'name' as const, sortOrder: 'asc' as const };
      const vehiclesListFilters = { name: undefined, manufacturer: undefined, vehicleClass: undefined, page: 1, pageSize: PAGE_SIZES.LIST_PAGE, sortBy: 'name' as const, sortOrder: 'asc' as const };
      const speciesListFilters = { name: undefined, classification: undefined, language: undefined, page: 1, pageSize: PAGE_SIZES.LIST_PAGE, sortBy: 'name' as const, sortOrder: 'asc' as const };
      const filmsListFilters = { title: undefined, director: undefined, page: 1, pageSize: PAGE_SIZES.LIST_PAGE, sortBy: 'episode_id' as const, sortOrder: 'asc' as const };

      await Promise.allSettled([
        prefetchPages(qc, 'characters', fetchCharacters, charactersListFilters, 3),
        prefetchPages(qc, 'planets', fetchPlanets, planetsListFilters, 3),
        prefetchPages(qc, 'starships', fetchStarships, starshipsListFilters, 3),
        prefetchPages(qc, 'vehicles', fetchVehicles, vehiclesListFilters, 3),
        prefetchPages(qc, 'species', fetchSpecies, speciesListFilters, 3),
        prefetchPages(qc, 'films', fetchFilms, filmsListFilters, 1),
      ]);

      if (import.meta.env.DEV) {
        console.log('[Prefetch] Fase 2: Páginas de listagem (3 páginas cada) carregadas.');
      }

      // ===== FASE 3 (BACKGROUND): FilmsPage =====
      const filmsPageFilters = {
        title: undefined,
        director: undefined,
        page: 1,
        pageSize: PAGE_SIZES.FILMS_PAGE,
        sortBy: 'episode_id' as const,
        sortOrder: 'asc' as const,
      };

      await qc.prefetchQuery({
        queryKey: ['films', filmsPageFilters],
        queryFn: () => fetchFilms(filmsPageFilters),
        staleTime: STALE_TIME,
      });

      if (import.meta.env.DEV) {
        console.log('[Prefetch] Fase 3: FilmsPage carregada.');
      }

      // ===== FASE 4 (BACKGROUND): ReportsPage =====
      const reportsCharacters = { page: 1, pageSize: PAGE_SIZES.REPORTS, sortBy: 'name' as const, sortOrder: 'asc' as const };
      const reportsPlanets = { page: 1, pageSize: PAGE_SIZES.REPORTS, sortBy: 'name' as const, sortOrder: 'asc' as const };
      const reportsStarships = { page: 1, pageSize: PAGE_SIZES.REPORTS, sortBy: 'name' as const, sortOrder: 'asc' as const };
      const reportsVehicles = { page: 1, pageSize: PAGE_SIZES.REPORTS, sortBy: 'name' as const, sortOrder: 'asc' as const };
      const reportsSpecies = { page: 1, pageSize: PAGE_SIZES.REPORTS, sortBy: 'name' as const, sortOrder: 'asc' as const };
      const reportsFilms = { page: 1, pageSize: PAGE_SIZES.REPORTS, sortBy: 'episode_id' as const, sortOrder: 'asc' as const };

      await Promise.allSettled([
        qc.prefetchQuery({ queryKey: ['reports', 'characters'], queryFn: () => fetchCharacters(reportsCharacters), staleTime: REPORTS_STALE_TIME }),
        qc.prefetchQuery({ queryKey: ['reports', 'planets'], queryFn: () => fetchPlanets(reportsPlanets), staleTime: REPORTS_STALE_TIME }),
        qc.prefetchQuery({ queryKey: ['reports', 'starships'], queryFn: () => fetchStarships(reportsStarships), staleTime: REPORTS_STALE_TIME }),
        qc.prefetchQuery({ queryKey: ['reports', 'vehicles'], queryFn: () => fetchVehicles(reportsVehicles), staleTime: REPORTS_STALE_TIME }),
        qc.prefetchQuery({ queryKey: ['reports', 'species'], queryFn: () => fetchSpecies(reportsSpecies), staleTime: REPORTS_STALE_TIME }),
        qc.prefetchQuery({ queryKey: ['reports', 'films'], queryFn: () => fetchFilms(reportsFilms), staleTime: REPORTS_STALE_TIME }),
      ]);

      if (import.meta.env.DEV) {
        console.log('[Prefetch] Fase 4: ReportsPage (100 itens cada) carregada.');
      }

      // ===== FASE 5 (BACKGROUND): GamificationPage =====
      const gamificationPromises = [
        qc.prefetchQuery({ queryKey: ['gamification', 'profile'], queryFn: fetchGamificationProfile, staleTime: STALE_TIME }),
        qc.prefetchQuery({ queryKey: ['gamification', 'achievements'], queryFn: fetchGamificationAchievements, staleTime: STALE_TIME }),
        qc.prefetchQuery({ queryKey: ['gamification', 'leaderboard', 10], queryFn: () => fetchGamificationLeaderboard(10), staleTime: STALE_TIME }),
        qc.prefetchQuery({ queryKey: ['gamification', 'daily-challenge'], queryFn: fetchDailyChallenge, staleTime: STALE_TIME }),
        qc.prefetchQuery({
          queryKey: ['reports', 'gamification'],
          queryFn: () => Promise.all([
            fetchGamificationProfile(),
            fetchGamificationAchievements(),
            fetchGamificationLeaderboard(10),
            fetchDailyChallenge(),
          ]).then(([profile, achievements, leaderboard, dailyChallenge]) => ({ profile, achievements, leaderboard, dailyChallenge })),
          staleTime: STALE_TIME,
        }),
      ];

      await Promise.allSettled(gamificationPromises);

      if (import.meta.env.DEV) {
        console.log('[Prefetch] Fase 5: GamificationPage carregada.');
      }

      // ===== FASE 6 (BACKGROUND): Quiz bulk data =====
      const quizCharacters = { page: 1, pageSize: PAGE_SIZES.QUIZ_BULK, sortBy: 'name' as const, sortOrder: 'asc' as const };
      const quizPlanets = { page: 1, pageSize: PAGE_SIZES.QUIZ_BULK, sortBy: 'name' as const, sortOrder: 'asc' as const };
      const quizStarships = { page: 1, pageSize: PAGE_SIZES.QUIZ_BULK, sortBy: 'name' as const, sortOrder: 'asc' as const };
      const quizVehicles = { page: 1, pageSize: PAGE_SIZES.QUIZ_BULK, sortBy: 'name' as const, sortOrder: 'asc' as const };
      const quizSpecies = { page: 1, pageSize: PAGE_SIZES.QUIZ_BULK, sortBy: 'name' as const, sortOrder: 'asc' as const };
      const quizFilms = { page: 1, pageSize: PAGE_SIZES.QUIZ_BULK, sortBy: 'episode_id' as const, sortOrder: 'asc' as const };

      await Promise.allSettled([
        prefetchPages(qc, 'characters', fetchCharacters, quizCharacters, 2),
        prefetchPages(qc, 'planets', fetchPlanets, quizPlanets, 2),
        prefetchPages(qc, 'starships', fetchStarships, quizStarships, 2),
        prefetchPages(qc, 'vehicles', fetchVehicles, quizVehicles, 2),
        prefetchPages(qc, 'species', fetchSpecies, quizSpecies, 2),
        prefetchPages(qc, 'films', fetchFilms, quizFilms, 1),
      ]);

      if (import.meta.env.DEV) {
        console.log('[Prefetch] Fase 6: Quiz bulk data carregado.');
        console.log('[Prefetch] ✅ COMPLETO! Todas as páginas terão navegação instantânea.');
      }
    }

    // Executa o prefetch
    prefetchAll();
  }, [queryClient]);
}
