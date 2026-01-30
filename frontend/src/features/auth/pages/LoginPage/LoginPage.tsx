import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './LoginPage.module.css';
import { useAuth } from '../../context/AuthContext';

declare global {
  interface Window {
    google?: any;
  }
}

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-gsi="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Falha ao carregar Google Sign-In.')));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleGsi = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Falha ao carregar Google Sign-In.'));
    document.head.appendChild(script);
  });
}

export function LoginPage() {
  const { loginWithGoogleCredential, error, status } = useAuth();
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const clientId = useMemo(() => import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined, []);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLocalError(null);
      if (!clientId?.trim()) {
        setLocalError('VITE_GOOGLE_CLIENT_ID não configurado no .env do frontend.');
        return;
      }
      try {
        await loadGoogleScript();
        if (cancelled) return;
        if (!window.google?.accounts?.id) {
          setLocalError('Google Identity Services indisponível.');
          return;
        }

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: { credential?: string }) => {
            const cred = response?.credential;
            if (!cred) {
              setLocalError('Não foi possível obter a credencial do Google.');
              return;
            }
            try {
              setLocalError(null);
              await loginWithGoogleCredential(cred);
            } catch {
              // erro já tratado no provider
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        if (buttonRef.current) {
          buttonRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(buttonRef.current, {
            // "filled_black" combina melhor com o tema dark/Star Wars.
            theme: 'filled_black',
            size: 'large',
            text: 'continue_with',
            shape: 'pill',
            width: 320,
          });
        }
      } catch (err) {
        if (err instanceof Error && err.message.trim()) {
          setLocalError(err.message);
        } else {
          setLocalError('Falha ao inicializar login do Google.');
        }
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, [clientId, loginWithGoogleCredential]);

  return (
    <div className={styles.container}>
      <div className={styles.panel}>
        <div className={styles.title}>Holocron Analytics</div>
        <div className={styles.subtitle}>
          Faça login para desbloquear sua experiência personalizada (gamificação, histórico de conversas e mais).
        </div>

        <div className={styles.googleButtonWrap}>
          <div className={styles.googleFrame}>
            <div className={styles.googleInner} ref={buttonRef} />
          </div>
        </div>

        <div className={styles.hint}>
          {status === 'loading' ? 'Verificando sessão…' : 'Seu login será lembrado via cookie seguro (refresh) + JWT.'}
        </div>

        {(localError || error) && <div className={styles.error}>{localError || error}</div>}
      </div>
    </div>
  );
}

