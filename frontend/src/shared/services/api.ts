export interface ApiError extends Error {
    status?: number;
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';
const USER_ID_HEADER = 'X-User-Id';
const USER_ID_STORAGE_KEY = 'holocron_user_id';

function getUserId(): string {
    try {
        const existing = localStorage.getItem(USER_ID_STORAGE_KEY);
        if (existing && existing.trim()) return existing;
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

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const error: ApiError = new Error('Falha ao consultar a API');
        error.status = response.status;
        throw error;
    }
    return response.json() as Promise<T>;
}

export async function apiGet<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>
): Promise<T> {
    const response = await fetch(buildUrl(path, params), {
        headers: { [USER_ID_HEADER]: getUserId() },
    });
    return handleResponse<T>(response);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(buildUrl(path), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', [USER_ID_HEADER]: getUserId() },
        body: JSON.stringify(body),
    });
    return handleResponse<T>(response);
}
