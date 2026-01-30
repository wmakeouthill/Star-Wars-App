import { apiGet } from '@/shared/services/api';
import { PaginatedResponse } from '@/shared/types/common.types';
import { Planet, PlanetFilters } from '../types/planets.types';

export async function fetchPlanets(filters: PlanetFilters) {
    return apiGet<PaginatedResponse<Planet>>('/api/v1/planets', {
        name: filters.name,
        climate: filters.climate,
        sort_by: filters.sortBy,
        sort_order: filters.sortOrder,
        page: filters.page,
        page_size: filters.pageSize,
    });
}

export async function fetchPlanetById(planetId: string, includeRelations: boolean) {
    return apiGet<Planet>(`/api/v1/planets/${planetId}`, {
        include_relations: includeRelations,
    });
}
