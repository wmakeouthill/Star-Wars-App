import { useQuery } from '@tanstack/react-query';
import { fetchStarshipById } from '../services/starships.service';

export function useStarshipDetails(starshipId: string | null) {
    return useQuery({
        queryKey: ['starship', starshipId],
        queryFn: () => fetchStarshipById(starshipId as string, true),
        enabled: !!starshipId,
    });
}

