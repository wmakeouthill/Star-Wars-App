import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCharacterImageFallbacks, upsertCharacterImageFallback } from '../services/characterImageFallbacks.service';
import type { CharacterImageFallback, CharacterImageFallbackUpsertRequest } from '../types/characterImageFallback.types';

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export const characterImageFallbackKeys = {
  all: ['characterImageFallbacks'] as const,
  list: (search: string) => [...characterImageFallbackKeys.all, 'list', search] as const,
};

export function useCharacterImageFallbackByCharacterName(characterName: string, enabled: boolean) {
  const search = characterName.trim();
  return useQuery({
    queryKey: characterImageFallbackKeys.list(search),
    enabled: enabled && !!search,
    queryFn: async () => {
      const rows = await fetchCharacterImageFallbacks(search);
      const target = normalizeName(search);
      return rows.find((row) => normalizeName(row.character_name) === target) ?? null;
    },
  });
}

export function useUpsertCharacterImageFallback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CharacterImageFallbackUpsertRequest) => upsertCharacterImageFallback(payload),
    onSuccess: (saved: CharacterImageFallback) => {
      queryClient.invalidateQueries({ queryKey: characterImageFallbackKeys.all });
      queryClient.invalidateQueries({ queryKey: ['characters'] });
      queryClient.invalidateQueries({ queryKey: ['character'] });
      // também invalida a busca específica pelo nome atualizado
      queryClient.invalidateQueries({
        queryKey: characterImageFallbackKeys.list(saved.character_name),
      });
    },
  });
}

