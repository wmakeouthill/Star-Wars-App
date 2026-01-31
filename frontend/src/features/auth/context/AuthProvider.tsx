import { PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AuthContext, AuthStatus } from './AuthContext';
import { AuthUser } from '../types/auth.types';
import { loginWithGoogleCredential, logout as logoutApi, refreshSession } from '../services/auth.service';
import type { ApiError } from '@/shared/services/api';
import { clearSessionStorage } from '@/shared/services/api';

// Em dev (React StrictMode), efeitos podem disparar duas vezes no mount.
// Como isso é um provider global, garantimos apenas 1 tentativa de refresh por carga.
let didAttemptInitialRefresh = false;

export function AuthProvider({ children }: Readonly<PropsWithChildren>) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    setStatus('loading');
    try {
      const session = await refreshSession();
      if (!session) {
        setUser(null);
        setStatus('unauthenticated');
        return;
      }
      setUser(session.user);
      setStatus('authenticated');
    } catch (err) {
      setUser(null);
      setStatus('unauthenticated');
      const apiError = err as Partial<ApiError> | null;
      const statusCode = typeof apiError?.status === 'number' ? apiError.status : undefined;
      // Erros diferentes de "sem sessão" devem aparecer para o usuário.
      if (statusCode !== undefined && statusCode !== 204) {
        setError('Falha ao verificar sessão. Tente novamente.');
      }
    }
  }, []);

  const login = useCallback(async (credential: string) => {
    setError(null);
    setStatus('loading');
    try {
      const session = await loginWithGoogleCredential(credential);
      setUser(session.user);
      setStatus('authenticated');
    } catch (e) {
      setUser(null);
      setStatus('unauthenticated');
      setError('Não foi possível autenticar. Tente novamente.');
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    try {
      await logoutApi();
    } finally {
      // Limpa todos os dados em cache para garantir logout completo
      queryClient.clear();
      clearSessionStorage();
      setUser(null);
      setStatus('unauthenticated');
    }
  }, [queryClient]);

  useEffect(() => {
    if (didAttemptInitialRefresh) return;
    didAttemptInitialRefresh = true;
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      status,
      user,
      error,
      loginWithGoogleCredential: login,
      logout,
      refresh,
    }),
    [status, user, error, login, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

