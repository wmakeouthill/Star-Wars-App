export interface ApiError extends Error {
    status?: number;
}

/**
 * Em produção (Vercel), o app deve chamar o PRÓPRIO domínio e deixar a Vercel Function
 * (`/api/[...path].js`) fazer o proxy para o backend real. Isso evita CORS e evita
 * prompts do browser de "rede local" causados por BASE_URL apontando para localhost.
 *
 * Em dev, mantemos a possibilidade de apontar direto para o backend local via
 * `VITE_API_BASE_URL` (ex.: http://localhost:8000).
 */
const BASE_URL = import.meta.env.DEV
  ? (import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:8000')
  : (globalThis.location?.origin ?? 'http://localhost:8000');
const USER_ID_HEADER = 'X-User-Id';
const USER_AUTH_HEADER = 'X-User-Authorization';
const USER_ID_STORAGE_KEY = 'holocron_user_id';
const AUTH_REFRESH_PATHNAME = '/api/v1/auth/refresh';
let accessToken: string | null = null;
let refreshInFlight: Promise<string | null> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

/**
 * Limpa todos os dados de sessão do localStorage.
 * Usado no logout para garantir que o usuário seja completamente deslogado.
 */
export function clearSessionStorage() {
  try {
    localStorage.removeItem(USER_ID_STORAGE_KEY);
  } catch {
    // Ignora erros de storage (modo privado, etc.)
  }
}

function getUserId(): string {
    try {
        const existing = localStorage.getItem(USER_ID_STORAGE_KEY);
        if (existing?.trim()) return existing;
        const generated = crypto.randomUUID();
        localStorage.setItem(USER_ID_STORAGE_KEY, generated);
        return generated;
    } catch {
        // Fallback: sem storage (modo privado, etc.)
        return 'guest';
    }
}

function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>) {
    const url = new URL(path, BASE_URL);
    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== '') {
                url.searchParams.set(key, String(value));
            }
        });
    }
    return url.toString();
}

function isAuthRefreshRequest(input: RequestInfo | URL): boolean {
  try {
    let raw: string;
    if (input instanceof URL) {
      raw = input.toString();
    } else if (input instanceof Request) {
      raw = input.url;
    } else {
      raw = String(input);
    }
    const url = new URL(raw, BASE_URL);
    return url.pathname === AUTH_REFRESH_PATHNAME;
  } catch {
    // Se não for URL válida, assume que não é refresh.
    return false;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const error: ApiError = new Error('Falha ao consultar a API');
        error.status = response.status;
        try {
          const json = (await response.json()) as { detail?: unknown } | null;
          const detail = json?.detail;
          if (typeof detail === 'string' && detail.trim()) error.message = detail;
        } catch (e) {
          error.cause = e;
          // Fallback inteligente quando não houver JSON de erro.
          if (response.status === 401) error.message = 'Não autenticado.';
          if (response.status === 403) error.message = 'Sem permissão.';
        }
        throw error;
    }
    if (response.status === 204) {
      // Sem conteúdo (ex.: refresh sem sessão). Evita JSON.parse em body vazio.
      return undefined as unknown as T;
    }
    return response.json() as Promise<T>;
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const response = await fetch(buildUrl(AUTH_REFRESH_PATHNAME), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', [USER_ID_HEADER]: getUserId() },
        body: JSON.stringify({}),
      });
      const data = await handleResponse<{ access_token: string }>(response);
      if (data?.access_token) {
        setAccessToken(data.access_token);
        return data.access_token;
      }
      return null;
    } catch {
      setAccessToken(null);
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function fetchWithAuthRetry(input: RequestInfo | URL, init: RequestInit, retry401 = true) {
  try {
    const response = await fetch(input, init);
    // Evita recursão: /auth/refresh NÃO deve tentar refresh novamente.
    if (response.status === 401 && retry401 && !isAuthRefreshRequest(input)) {
      const next = await refreshAccessToken();
      if (next) {
        const headers = new Headers(init.headers);
        headers.set(USER_AUTH_HEADER, `Bearer ${next}`);
        return fetch(input, { ...init, headers });
      }
    }
    return response;
  } catch (err) {
    const error: ApiError = new Error('Falha de rede ao consultar a API');
    error.status = 0;
    if (err instanceof Error) {
      error.cause = err;
      if (err.message) error.message = `Falha de rede ao consultar a API: ${err.message}`;
    }
    throw error;
  }
}

export async function apiGet<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>
): Promise<T> {
    const headers: Record<string, string> = { [USER_ID_HEADER]: getUserId() };
    if (accessToken) headers[USER_AUTH_HEADER] = `Bearer ${accessToken}`;

    const url = buildUrl(path, params);
    const response = await fetchWithAuthRetry(url, {
        credentials: 'include',
        headers,
    });
    // O backend pode responder 304 (ETag) em GET; dependendo do modo de cache do browser,
    // isso pode chegar ao JS sem body. Nesse caso, refazemos o GET bypassando o cache
    // para garantir um 200 com JSON (correção defensiva).
    if (response.status === 304) {
      const retry = await fetchWithAuthRetry(url, {
        credentials: 'include',
        headers,
        cache: 'no-store',
      });
      return handleResponse<T>(retry);
    }
    return handleResponse<T>(response);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', [USER_ID_HEADER]: getUserId() };
    if (accessToken) headers[USER_AUTH_HEADER] = `Bearer ${accessToken}`;

    const response = await fetchWithAuthRetry(buildUrl(path), {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify(body),
    });
    return handleResponse<T>(response);
}
