import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchImageFallbacks, upsertImageFallback } from '@/shared/services/imageFallbacks.service';
import type { ImageFallback, ImageFallbackUpsertRequest } from '@/shared/types/imageFallback.types';

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeResource(value: string): string {
  const normalized = value.trim().replace(/^\/+|\/+$/g, '').toLowerCase();
  // Alias: no backend aceitamos planets como locations.
  if (normalized === 'planets') return 'locations';
  return normalized;
}

export const imageFallbackKeys = {
  all: ['imageFallbacks'] as const,
  list: (resource: string, search: string) => [...imageFallbackKeys.all, 'list', resource, search] as const,
};

function getQueryKeyPrefixesToInvalidate(resource: string): Array<readonly unknown[]> {
  const normalized = normalizeResource(resource);
  if (normalized === 'characters') return [['characters'], ['character']];
  if (normalized === 'locations') return [['planets'], ['planet']];
  if (normalized === 'starships') return [['starships'], ['starship']];
  if (normalized === 'vehicles') return [['vehicles'], ['vehicle']];
  if (normalized === 'species') return [['species']];
  if (normalized === 'films') return [['films'], ['film']];
  return [];
}

export function useImageFallbackByName(resource: string, itemName: string, enabled: boolean) {
  const search = itemName.trim();
  const normalizedResource = normalizeResource(resource);
  return useQuery({
    queryKey: imageFallbackKeys.list(normalizedResource, search),
    enabled: enabled && !!search,
    queryFn: async () => {
      const rows = await fetchImageFallbacks(normalizedResource, search);
      const target = normalizeName(search);
      return rows.find((row) => normalizeName(row.item_name) === target) ?? null;
    },
  });
}

export function useUpsertImageFallback(resource: string) {
  const queryClient = useQueryClient();
  const normalizedResource = normalizeResource(resource);
  return useMutation({
    mutationFn: (payload: ImageFallbackUpsertRequest) => upsertImageFallback(normalizedResource, payload),
    onSuccess: (saved: ImageFallback) => {
      queryClient.invalidateQueries({ queryKey: imageFallbackKeys.all });
      queryClient.invalidateQueries({ queryKey: imageFallbackKeys.list(normalizedResource, saved.item_name) });
      getQueryKeyPrefixesToInvalidate(normalizedResource).forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey });
      });
    },
  });
}

