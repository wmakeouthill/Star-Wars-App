import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchFilmCharacters } from '../services/film-characters.service';

export function useFilmCharacters(filmId: string | null, page: number, pageSize: number) {
    return useQuery({
        queryKey: ['films', filmId, 'characters', page, pageSize],
        queryFn: () => fetchFilmCharacters(filmId!, page, pageSize),
        enabled: Boolean(filmId),
        placeholderData: keepPreviousData,
    });
}
