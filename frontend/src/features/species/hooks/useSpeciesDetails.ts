import { useQuery } from '@tanstack/react-query';
import { fetchSpeciesById } from '../services/species.service';

export function useSpeciesDetails(speciesId: string | null) {
    return useQuery({
        queryKey: ['species', speciesId],
        queryFn: () => fetchSpeciesById(speciesId as string),
        enabled: !!speciesId,
    });
}

