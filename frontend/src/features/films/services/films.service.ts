import { apiGet } from '@/shared/services/api';
import { PaginatedResponse } from '@/shared/types/common.types';
import { Film, FilmFilters } from '../types/films.types';

export async function fetchFilms(filters: FilmFilters) {
    return apiGet<PaginatedResponse<Film>>('/api/v1/films', {
        title: filters.title,
        director: filters.director,
        sort_by: filters.sortBy,
        sort_order: filters.sortOrder,
        page: filters.page,
        page_size: filters.pageSize,
    });
}

export async function fetchFilmById(filmId: string, includeRelations: boolean) {
    return apiGet<Film>(`/api/v1/films/${filmId}`, {
        include_relations: includeRelations,
    });
}
