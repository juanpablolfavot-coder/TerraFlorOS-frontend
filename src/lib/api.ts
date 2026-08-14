import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { getAccessToken, notifySessionExpired, setAccessToken } from "./session";

declare module "axios" {
  export interface AxiosRequestConfig {
    /** Interno: marca que esta request ya se reintentó tras refrescar. */
    _retry?: boolean;
    /** No intentar refrescar la sesión si esta request devuelve 401. */
    skipAuthRefresh?: boolean;
  }
}

/**
 * baseURL = ORIGEN del backend. Las rutas del cliente incluyen el prefijo
 * `/api`, así que se limpia una barra o un `/api` final para evitar el
 * clásico `/api/api/...`.
 */
export const API_BASE_URL = (import.meta.env.VITE_API_URL ?? "")
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");

export const AUTH_ROUTES = {
  login: "/api/auth/login",
  refresh: "/api/auth/refresh",
  logout: "/api/auth/logout",
  me: "/api/auth/me",
} as const;

export const api = axios.create({
  baseURL: API_BASE_URL,
  // Imprescindible: el refresh token viaja en cookie httpOnly cross-origin.
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// --------------------------------------------------------------------
// Request: adjuntar el access token que esté vigente en memoria
// --------------------------------------------------------------------

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});

// --------------------------------------------------------------------
// Refresh de sesión, con una sola petición en vuelo
// --------------------------------------------------------------------

/**
 * Si varias requests fallan con 401 a la vez, todas esperan el MISMO
 * refresh. Sin esto el backend vería varios refresh concurrentes con la
 * misma cookie, lo interpretaría como reuso de token y revocaría todas
 * las sesiones del usuario.
 */
let refreshInFlight: Promise<string> | null = null;

export function refreshAccessToken(): Promise<string> {
  refreshInFlight ??= api
    .post<{ accessToken: string }>(AUTH_ROUTES.refresh, null, { skipAuthRefresh: true })
    .then((response) => {
      const { accessToken } = response.data;
      setAccessToken(accessToken);
      return accessToken;
    })
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

/** Rutas donde un 401 es la respuesta normal, no una sesión vencida. */
function isAuthEndpoint(url: string | undefined): boolean {
  if (!url) return false;
  return (
    url.endsWith(AUTH_ROUTES.refresh) ||
    url.endsWith(AUTH_ROUTES.login) ||
    url.endsWith(AUTH_ROUTES.logout)
  );
}

// --------------------------------------------------------------------
// Response: ante 401, UN solo intento de refresh + reintento original
// --------------------------------------------------------------------

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    const shouldTryRefresh =
      error.response?.status === 401 &&
      config !== undefined &&
      config._retry !== true &&
      config.skipAuthRefresh !== true &&
      !isAuthEndpoint(config.url);

    if (!shouldTryRefresh) return Promise.reject(error);

    // Marcar ANTES de reintentar: si el reintento vuelve a dar 401, este
    // flag corta el ciclo y el error sube tal cual.
    config._retry = true;

    try {
      const token = await refreshAccessToken();
      config.headers.set("Authorization", `Bearer ${token}`);
      return await api(config);
    } catch {
      // El refresh también falló: la sesión está muerta de verdad.
      notifySessionExpired();
      return Promise.reject(error);
    }
  }
);

// --------------------------------------------------------------------
// Errores del backend
// --------------------------------------------------------------------

/** Forma de error que devuelve el backend (ver middleware/errorHandler). */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Array<{ path: string; message: string }> | unknown | null;
  };
}

export type ApiError = AxiosError<ApiErrorBody>;

export function isApiError(error: unknown): error is ApiError {
  return axios.isAxiosError(error);
}

/** Código de error del backend (`VALIDATION_ERROR`, `FORBIDDEN`, ...). */
export function getApiErrorCode(error: unknown): string | null {
  return isApiError(error) ? (error.response?.data?.error?.code ?? null) : null;
}

/** Mensaje listo para mostrarle al usuario, siempre en castellano. */
export function getApiErrorMessage(error: unknown, fallback = "Ocurrió un error inesperado"): string {
  if (!isApiError(error)) return error instanceof Error ? error.message : fallback;

  const message = error.response?.data?.error?.message;
  if (message) return message;

  if (error.code === "ERR_NETWORK") {
    return "No se pudo conectar con el servidor. Revisá tu conexión.";
  }
  if (error.code === "ECONNABORTED") {
    return "El servidor tardó demasiado en responder.";
  }
  return fallback;
}

/** Errores de validación de Zod mapeados a `{ campo: mensaje }`. */
export function getApiFieldErrors(error: unknown): Record<string, string> {
  if (!isApiError(error)) return {};

  const details = error.response?.data?.error?.details;
  if (!Array.isArray(details)) return {};

  const fields: Record<string, string> = {};
  for (const detail of details) {
    if (
      typeof detail === "object" &&
      detail !== null &&
      "path" in detail &&
      "message" in detail &&
      typeof detail.path === "string" &&
      typeof detail.message === "string"
    ) {
      fields[detail.path] ??= detail.message;
    }
  }
  return fields;
}
