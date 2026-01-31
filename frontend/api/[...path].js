/**
 * Vercel Function (proxy universal) para TODAS as rotas /api/*
 *
 * Objetivo:
 * - O frontend chama `/api/v1/...` no MESMO domínio (Vercel) e evita CORS.
 * - Esta função encaminha para o backend real definido em `BACKEND_BASE_URL`.
 *
 * Variáveis esperadas (Vercel Project Settings -> Environment Variables):
 * - BACKEND_BASE_URL="https://seu-backend.exemplo.com"  (sem barra no final)
 */

const BACKEND_BASE_URL = (process.env.BACKEND_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');

function buildTargetUrl(req) {
  // req.query.path contém os segmentos após /api/
  const pathSegments = req.query?.path;
  let apiPath = '/api';

  if (Array.isArray(pathSegments)) {
    apiPath += '/' + pathSegments.join('/');
  } else if (pathSegments) {
    apiPath += '/' + String(pathSegments);
  }

  // Preserva query params originais (exceto 'path', que é do Vercel)
  const url = new URL(req.url, `http://${req.headers.host}`);
  const queryParams = new URLSearchParams();
  for (const [key, value] of url.searchParams) {
    if (key !== 'path') queryParams.append(key, value);
  }
  const queryString = queryParams.toString();

  return `${BACKEND_BASE_URL}${apiPath}${queryString ? `?${queryString}` : ''}`;
}

export default async function handler(req, res) {
  // (Opcional) responde OPTIONS caso algum cliente chame de fora.
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const targetUrl = buildTargetUrl(req);

    const headers = {};

    // Propaga headers relevantes
    if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'];
    if (req.headers.accept) headers.Accept = req.headers.accept;
    if (req.headers.authorization) headers.Authorization = req.headers.authorization;
    if (req.headers['x-user-id']) headers['X-User-Id'] = req.headers['x-user-id'];
    if (req.headers.cookie) headers.Cookie = req.headers.cookie;

    const fetchOptions = {
      method: req.method,
      headers,
    };

    // Adiciona body se não for GET/HEAD
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body !== undefined) {
      if (typeof req.body === 'string' || req.body instanceof Buffer) {
        fetchOptions.body = req.body;
      } else {
        fetchOptions.body = JSON.stringify(req.body);
      }
    }

    const response = await fetch(targetUrl, fetchOptions);

    // Propaga headers de resposta importantes
    const contentType = response.headers.get('content-type') || '';
    if (contentType) res.setHeader('Content-Type', contentType);

    const cacheControl = response.headers.get('cache-control');
    if (cacheControl) res.setHeader('Cache-Control', cacheControl);

    // Importante para auth via cookie (refresh_token)
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) res.setHeader('Set-Cookie', setCookie);

    res.status(response.status);

    // Binários
    if (
      contentType.startsWith('image/') ||
      contentType.startsWith('application/pdf') ||
      contentType.startsWith('application/octet-stream')
    ) {
      const buffer = Buffer.from(await response.arrayBuffer());
      return res.send(buffer);
    }

    // Texto/JSON
    const text = await response.text();
    if (!text) return res.end();

    if (contentType.includes('application/json')) {
      try {
        return res.json(JSON.parse(text));
      } catch {
        // JSON inválido, devolve como texto
        return res.send(text);
      }
    }

    return res.send(text);
  } catch (error) {
    console.error('[API Proxy Error]', error);
    return res.status(500).json({
      error: 'Erro no proxy',
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
}

