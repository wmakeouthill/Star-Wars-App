import { useQuery } from '@tanstack/react-query';
import { fetchStarships } from '../services/starships.service';
import { StarshipFilters } from '../types/starships.types';

export function useStarships(filters: StarshipFilters) {
    return useQuery({
        queryKey: ['starships', filters],
        queryFn: () => fetchStarships(filters),
    });
}
