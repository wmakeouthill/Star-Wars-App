import { apiGet, apiPost } from '@/shared/services/api';
import type { CharacterImageFallback, CharacterImageFallbackUpsertRequest } from '../types/characterImageFallback.types';

const BASE_PATH = '/api/v1/admin/character-image-fallbacks';

export async function fetchCharacterImageFallbacks(search?: string) {
  return apiGet<CharacterImageFallback[]>(BASE_PATH, {
    search: search?.trim() || undefined,
  });
}

export async function upsertCharacterImageFallback(payload: CharacterImageFallbackUpsertRequest) {
  return apiPost<CharacterImageFallback>(BASE_PATH, payload);
}

