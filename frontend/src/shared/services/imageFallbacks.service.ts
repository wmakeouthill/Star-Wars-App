import { apiGet, apiPost } from '@/shared/services/api';
import type { ImageFallback, ImageFallbackUpsertRequest } from '@/shared/types/imageFallback.types';

const BASE_PATH = '/api/v1/admin/image-fallbacks';

export async function fetchImageFallbacks(resource: string, search?: string) {
  const normalizedResource = resource.trim().replace(/^\/+|\/+$/g, '');
  return apiGet<ImageFallback[]>(`${BASE_PATH}/${normalizedResource}`, {
    search: search?.trim() || undefined,
  });
}

export async function upsertImageFallback(resource: string, payload: ImageFallbackUpsertRequest) {
  const normalizedResource = resource.trim().replace(/^\/+|\/+$/g, '');
  return apiPost<ImageFallback>(`${BASE_PATH}/${normalizedResource}`, payload);
}

