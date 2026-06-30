/**
 * URL base del API Express (sin barra final).
 * En desarrollo: copia `client/.env.example` a `client/.env` y ajusta `VITE_API_URL` si el backend no va en 127.0.0.1:3000.
 */
function trimTrailingSlashes(s) {
  return s.replace(/\/+$/, '');
}

const fromEnv = import.meta.env.VITE_API_URL;
const fallback = 'http://127.0.0.1:3000';

export const API_BASE =
  typeof fromEnv === 'string' && fromEnv.trim() !== ''
    ? trimTrailingSlashes(fromEnv.trim())
    : fallback;
