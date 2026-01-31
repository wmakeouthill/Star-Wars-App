import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from '@/App';
import '@/shared/styles/global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A maior parte dos dados do SWAPI é bem estática; aumentamos o cache em memória
      // para reduzir chamadas repetidas e acelerar navegação entre páginas.
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
