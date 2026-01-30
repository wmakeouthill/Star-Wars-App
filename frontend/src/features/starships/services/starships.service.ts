import { apiGet } from '@/shared/services/api';
import { PaginatedResponse } from '@/shared/types/common.types';
import { Starship, StarshipFilters } from '../types/starships.types';

export async function fetchStarships(filters: StarshipFilters) {
    return apiGet<PaginatedResponse<Starship>>('/api/v1/starships', {
        name: filters.name,
        manufacturer: filters.manufacturer,
        sort_by: filters.sortBy,
        sort_order: filters.sortOrder,
        page: filters.page,
        page_size: filters.pageSize,
    });
}
