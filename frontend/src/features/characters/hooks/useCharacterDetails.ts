import { useQuery } from '@tanstack/react-query';
import { fetchCharacterById } from '../services/characters.service';

export function useCharacterDetails(characterId: string | null) {
    return useQuery({
        queryKey: ['character', characterId],
        queryFn: () => fetchCharacterById(characterId as string, true),
        enabled: !!characterId,
    });
}

