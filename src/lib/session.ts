/**
 * Estado de sesión de bajo nivel, compartido entre el cliente HTTP y el
 * contexto de auth.
 *
 * El access token vive SOLO en memoria (nunca en localStorage ni
 * sessionStorage): si un XSS logra ejecutar código, no encuentra un token
 * persistido para robar. El refresh token vive en una cookie httpOnly que
 * pone el backend y que este código no puede leer.
 *
 * Consecuencia esperada: al recargar la página el token se pierde y hay
 * que rehidratar la sesión con POST /api/auth/refresh (lo hace AuthProvider).
 */

let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

type SessionExpiredListener = () => void;

const listeners = new Set<SessionExpiredListener>();

/**
 * Se avisa cuando la sesión murió del todo (el refresh también falló).
 * AuthProvider se suscribe para limpiar el usuario y mandar a /login.
 */
export function onSessionExpired(listener: SessionExpiredListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Limpia el token en memoria y notifica a los suscriptores. */
export function notifySessionExpired(): void {
  accessToken = null;

  if (listeners.size === 0) {
    // Sin React montado (o antes de montar): redirección dura como red de
    // seguridad, evitando un bucle si ya estamos en /login.
    if (window.location.pathname !== "/login") {
      window.location.assign("/login");
    }
    return;
  }

  for (const listener of listeners) listener();
}
