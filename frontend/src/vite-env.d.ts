/// <reference types="vite/client" />

// Fallback explícito (útil quando o TS/LSP não pega os tipos do Vite).
declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}

declare module '*.svg' {
  const src: string;
  export default src;
}

