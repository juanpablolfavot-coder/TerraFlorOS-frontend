import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, AUTH_ROUTES, refreshAccessToken } from "@/lib/api";
import { onSessionExpired, setAccessToken } from "@/lib/session";
import { AuthContext } from "./auth-context";
import type { AuthContextValue, AuthStatus, Credentials, LoginResponse, MeResponse, Session } from "./types";

const EMPTY_PERMISSIONS: ReadonlySet<string> = new Set<string>();

/** Trae el usuario y sus permisos efectivos. Requiere token en memoria. */
async function fetchSession(): Promise<Session> {
  const { data } = await api.get<MeResponse>(AUTH_ROUTES.me);
  return {
    user: data.user,
    role: data.role,
    permissions: new Set(data.permissions),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const queryClient = useQueryClient();

  /** Borra todo rastro de la sesión anterior, incluida la caché de datos. */
  const clearSession = useCallback(() => {
    setAccessToken(null);
    setSession(null);
    setStatus("unauthenticated");
    queryClient.clear();
  }, [queryClient]);

  // ------------------------------------------------------------------
  // Arranque: rehidratar la sesión con la cookie de refresh
  // ------------------------------------------------------------------

  const bootstrapped = useRef(false);

  useEffect(() => {
    // StrictMode monta dos veces en desarrollo. Sin esta guarda saldrían
    // dos refresh con la misma cookie y el backend lo leería como reuso
    // de token: revocaría todas las sesiones del usuario.
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    // Sin bandera de cancelación a propósito: con la guarda de arriba, el
    // desmontaje de StrictMode abortaría el único arranque que hay y la
    // app se quedaría para siempre en "loading". AuthProvider vive lo
    // mismo que la app, así que no hay fuga.
    void (async () => {
      try {
        await refreshAccessToken();
        const restored = await fetchSession();
        setSession(restored);
        setStatus("authenticated");
      } catch {
        // Sin cookie válida: simplemente no hay sesión que restaurar.
        setAccessToken(null);
        setSession(null);
        setStatus("unauthenticated");
      }
    })();
  }, []);

  // ------------------------------------------------------------------
  // Sesión vencida desde el interceptor (el refresh también falló)
  // ------------------------------------------------------------------

  useEffect(() => onSessionExpired(clearSession), [clearSession]);

  // ------------------------------------------------------------------
  // Acciones
  // ------------------------------------------------------------------

  const login = useCallback(
    async ({ username, password }: Credentials) => {
      // `skipAuthRefresh`: un 401 acá es "credenciales inválidas", no una
      // sesión vencida — no tiene sentido intentar refrescar.
      const { data } = await api.post<LoginResponse>(
        AUTH_ROUTES.login,
        { username, password },
        { skipAuthRefresh: true }
      );

      setAccessToken(data.accessToken);

      // El login devuelve el rol pero no los permisos efectivos: para eso
      // hace falta /me.
      try {
        const loaded = await fetchSession();
        queryClient.clear();
        setSession(loaded);
        setStatus("authenticated");
      } catch (error) {
        setAccessToken(null);
        throw error;
      }
    },
    [queryClient]
  );

  const logout = useCallback(async () => {
    try {
      // `undefined`, no `null`: logout tampoco lleva cuerpo (ver api.ts).
      await api.post(AUTH_ROUTES.logout, undefined, { skipAuthRefresh: true });
    } catch {
      // Si el backend no responde igual cerramos la sesión del lado del
      // cliente: el token en memoria se pierde de todos modos.
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const reloadSession = useCallback(async () => {
    const reloaded = await fetchSession();
    setSession(reloaded);
    setStatus("authenticated");
  }, []);

  // ------------------------------------------------------------------

  const value = useMemo<AuthContextValue>(() => {
    const permissions = session?.permissions ?? EMPTY_PERMISSIONS;
    const can = (permission: string) => permissions.has(permission);

    return {
      status,
      user: session?.user ?? null,
      role: session?.role ?? null,
      permissions,
      isAuthenticated: status === "authenticated" && session !== null,
      login,
      logout,
      reloadSession,
      can,
      canAny: (codes) => codes.some(can),
      canAll: (codes) => codes.every(can),
    };
  }, [session, status, login, logout, reloadSession]);

  return <AuthContext value={value}>{children}</AuthContext>;
}
