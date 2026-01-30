import { useQuery } from '@tanstack/react-query';
import { fetchPlanets } from '../services/planets.service';
import { PlanetFilters } from '../types/planets.types';

export function usePlanets(filters: PlanetFilters) {
    return useQuery({
        queryKey: ['planets', filters],
        queryFn: () => fetchPlanets(filters),
    });
}
