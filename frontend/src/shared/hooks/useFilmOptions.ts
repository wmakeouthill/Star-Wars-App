import { useQuery } from '@tanstack/react-query';
import { fetchFilms } from '@/features/films/services/films.service';
import type { CustomSelectOption } from '@/shared/components';

/**
 * Hook para buscar lista de filmes para uso em dropdowns de filtros.
 * Retorna filmes formatados como opções de select.
 */
export function useFilmOptions() {
    const query = useQuery({
        queryKey: ['films', 'all-for-filter'],
        queryFn: async () => {
            // Busca todos os filmes (são apenas 6-7, então não precisa paginação)
            const response = await fetchFilms({
                page: 1,
                pageSize: 100, // Garante que pega todos
                sortBy: 'episode_id',
                sortOrder: 'asc',
            });
            return response.items;
        },
        staleTime: 1000 * 60 * 30, // 30 minutos (filmes não mudam)
        gcTime: 1000 * 60 * 60, // 1 hora
    });

    const options: CustomSelectOption[] =
        query.data?.map((film) => ({
            value: film.id,
            label: `Episode ${film.episode_id} - ${film.title}`,
        })) || [];

    return {
        options,
        isLoading: query.isLoading,
        isError: query.isError,
    };
}
