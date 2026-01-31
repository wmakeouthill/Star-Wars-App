import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchCharacters } from '../services/characters.service';
import { CharacterFilters } from '../types/characters.types';

export function useCharacters(filters: CharacterFilters) {
    return useQuery({
        queryKey: ['characters', filters],
        queryFn: () => fetchCharacters(filters),
        placeholderData: keepPreviousData,
    });
}
