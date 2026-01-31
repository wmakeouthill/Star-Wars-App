import { apiGet, apiPost, setAccessToken } from '@/shared/services/api';
import { AuthSessionResponse, AuthUser } from '../types/auth.types';

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export async function loginWithGoogleCredential(credential: string): Promise<AuthSessionResponse> {
  const session = await apiPost<AuthSessionResponse>('/api/v1/auth/google', { credential });
  setAccessToken(session.access_token);
  return session;
}

export async function refreshSession(): Promise<AuthSessionResponse | null> {
  // backend lê refresh_token do cookie httpOnly.
  // Quando não existe sessão, o backend retorna 204.
  // Em dev (Docker + uvicorn --reload), é comum o backend reiniciar no meio do load inicial,
  // causando erros transitórios de rede (ex.: ERR_EMPTY_RESPONSE). Fazemos retry curto.
  const backoffMs = [0, 250, 750];
  let lastErr: unknown = null;

  for (let i = 0; i < backoffMs.length; i++) {
    if (backoffMs[i] > 0) await sleep(backoffMs[i]);
    try {
      const session = await apiPost<AuthSessionResponse | null>('/api/v1/auth/refresh', {});
      if (!session?.access_token) {
        setAccessToken(null);
        return null;
      }
      setAccessToken(session.access_token);
      return session;
    } catch (err) {
      lastErr = err;
      const maybeStatus = (err as { status?: unknown } | null)?.status;
      const status = typeof maybeStatus === 'number' ? maybeStatus : undefined;
      // status=0 -> falha de rede (fetch). Tenta novamente.
      if (status === 0 && i < backoffMs.length - 1) continue;
      throw err;
    }
  }

  // Não deveria chegar aqui, mas mantém consistência.
  throw lastErr;
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

