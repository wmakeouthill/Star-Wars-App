import { apiGet, apiPost, setAccessToken } from '@/shared/services/api';
import { AuthSessionResponse, AuthUser } from '../types/auth.types';

export async function loginWithGoogleCredential(credential: string): Promise<AuthSessionResponse> {
  const session = await apiPost<AuthSessionResponse>('/api/v1/auth/google', { credential });
  setAccessToken(session.access_token);
  return session;
}

export async function refreshSession(): Promise<AuthSessionResponse | null> {
  // backend lê refresh_token do cookie httpOnly.
  // Quando não existe sessão, o backend retorna 204.
  const session = await apiPost<AuthSessionResponse | null>('/api/v1/auth/refresh', {});
  if (!session?.access_token) {
    setAccessToken(null);
    return null;
  }
  setAccessToken(session.access_token);
  return session;
}

export async function logout(): Promise<void> {
  try {
    await apiPost<{ ok: boolean }>('/api/v1/auth/logout', {});
  } finally {
    setAccessToken(null);
  }
}

export async function me(): Promise<AuthUser> {
  return apiGet<AuthUser>('/api/v1/auth/me');
}

