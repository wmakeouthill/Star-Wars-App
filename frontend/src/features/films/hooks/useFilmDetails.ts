import { useQuery } from '@tanstack/react-query';
import { fetchFilmById } from '../services/films.service';

export function useFilmDetails(filmId: string | null) {
    return useQuery({
        queryKey: ['film', filmId],
        queryFn: () => fetchFilmById(filmId as string, true),
        enabled: !!filmId,
    });
}

