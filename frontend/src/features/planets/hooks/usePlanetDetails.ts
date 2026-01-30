import { useQuery } from '@tanstack/react-query';
import { fetchPlanetById } from '../services/planets.service';

export function usePlanetDetails(planetId: string | null) {
    return useQuery({
        queryKey: ['planet', planetId],
        queryFn: () => fetchPlanetById(planetId as string, true),
        enabled: !!planetId,
    });
}

