import { useQuery } from '@tanstack/react-query';
import { fetchFilms } from '../services/films.service';
import { FilmFilters } from '../types/films.types';

export function useFilms(filters: FilmFilters) {
    return useQuery({
        queryKey: ['films', filters],
        queryFn: () => fetchFilms(filters),
    });
}
