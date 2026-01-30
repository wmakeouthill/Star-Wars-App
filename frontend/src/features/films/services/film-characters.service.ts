import { apiGet } from '@/shared/services/api';
import { PaginatedResponse } from '@/shared/types/common.types';
import { Character } from '@/features/characters/types/characters.types';

export async function fetchFilmCharacters(filmId: string, page: number, pageSize: number) {
    return apiGet<PaginatedResponse<Character>>(`/api/v1/films/${filmId}/characters`, {
        page,
        page_size: pageSize,
    });
}
