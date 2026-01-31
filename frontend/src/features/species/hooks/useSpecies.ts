import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchSpecies } from '../services/species.service';
import { SpeciesFilters } from '../types/species.types';

export function useSpecies(filters: SpeciesFilters) {
    return useQuery({
        queryKey: ['species', filters],
        queryFn: () => fetchSpecies(filters),
        placeholderData: keepPreviousData,
    });
}

