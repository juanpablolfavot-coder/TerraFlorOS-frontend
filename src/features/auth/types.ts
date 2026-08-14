import type { PermissionCode } from "./permissions";

/** Usuario tal como lo devuelve GET /api/auth/me. */
export interface AuthUser {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  branchId: number | null;
}

/** Respuesta de GET /api/auth/me */
export interface MeResponse {
  user: AuthUser;
  role: string;
  /** Permisos EFECTIVOS: los del rol ± los overrides individuales. */
  permissions: string[];
}

/** Respuesta de POST /api/auth/login */
export interface LoginResponse {
  accessToken: string;
  user: AuthUser & { role: string };
}

export interface Credentials {
  username: string;
  password: string;
}

export interface Session {
  user: AuthUser;
  role: string;
  permissions: ReadonlySet<string>;
}

/**
 * `loading` es el arranque de la app, mientras se intenta rehidratar la
 * sesión con la cookie de refresh. Sin este estado la app parpadearía
 * hacia /login en cada recarga.
 */
export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  role: string | null;
  permissions: ReadonlySet<string>;
  isAuthenticated: boolean;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => Promise<void>;
  /** Relee /api/auth/me (por ejemplo, tras cambiarle permisos al usuario). */
  reloadSession: () => Promise<void>;
  can: (permission: PermissionCode | string) => boolean;
  canAny: (permissions: Array<PermissionCode | string>) => boolean;
  canAll: (permissions: Array<PermissionCode | string>) => boolean;
}
