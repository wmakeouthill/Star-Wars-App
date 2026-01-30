import { apiGet } from '@/shared/services/api';
import { PaginatedResponse } from '@/shared/types/common.types';
import { Character, CharacterFilters } from '../types/characters.types';

export async function fetchCharacters(filters: CharacterFilters) {
    return apiGet<PaginatedResponse<Character>>('/api/v1/characters', {
        name: filters.name,
        gender: filters.gender,
        homeworld: filters.homeworld,
        film_id: filters.filmId,
        min_height: filters.minHeight,
        max_height: filters.maxHeight,
        sort_by: filters.sortBy,
        sort_order: filters.sortOrder,
        page: filters.page,
        page_size: filters.pageSize,
    });
}

export async function fetchCharacterById(characterId: string, includeRelations: boolean) {
    return apiGet<Character>(`/api/v1/characters/${characterId}`, {
        include_relations: includeRelations,
    });
}
