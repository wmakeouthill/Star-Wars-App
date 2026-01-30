import { apiGet } from '@/shared/services/api';
import { PaginatedResponse } from '@/shared/types/common.types';
import { Species, SpeciesFilters } from '../types/species.types';

export async function fetchSpecies(filters: SpeciesFilters) {
    return apiGet<PaginatedResponse<Species>>('/api/v1/species', {
        name: filters.name,
        classification: filters.classification,
        language: filters.language,
        sort_by: filters.sortBy,
        sort_order: filters.sortOrder,
        page: filters.page,
        page_size: filters.pageSize,
    });
}

export async function fetchSpeciesById(speciesId: string) {
    return apiGet<Species>(`/api/v1/species/${speciesId}`);
}

