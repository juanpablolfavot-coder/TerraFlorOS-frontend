import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Spinner } from "@/components/ui";
import type { PermissionCode } from "./permissions";
import { useAuth } from "./useAuth";

/** Pantalla de arranque mientras se rehidrata la sesión. */
export function AuthSplash() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-stone-50 text-brand-600">
      <Spinner size="lg" label="Iniciando TerraFlorOS" />
    </div>
  );
}

/**
 * Portón de la app: sin sesión, a /login (recordando a dónde iba el
 * usuario para volver ahí después del login).
 */
export function RequireAuth() {
  const { status, isAuthenticated } = useAuth();
  const location = useLocation();

  if (status === "loading") return <AuthSplash />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

/** Ruta que además exige un permiso. Sin él, 403 (no un redirect a /login). */
export function RequirePermission({
  permission,
  anyOf,
}: {
  permission?: PermissionCode | string;
  anyOf?: Array<PermissionCode | string>;
}) {
  const { can, canAny } = useAuth();

  const allowed =
    (permission === undefined || can(permission)) && (anyOf === undefined || canAny(anyOf));

  if (!allowed) return <Navigate to="/sin-permiso" replace />;

  return <Outlet />;
}

/**
 * Muestra `children` solo si el usuario tiene el permiso.
 * Para botones y secciones sueltas dentro de una pantalla.
 */
export function Can({
  permission,
  anyOf,
  fallback = null,
  children,
}: {
  permission?: PermissionCode | string;
  anyOf?: Array<PermissionCode | string>;
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const { can, canAny } = useAuth();

  const allowed =
    (permission === undefined || can(permission)) && (anyOf === undefined || canAny(anyOf));

  return allowed ? <>{children}</> : <>{fallback}</>;
}
