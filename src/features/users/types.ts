/**
 * Usuarios, roles y permisos (`/api/users`, `/api/roles`, `/api/permissions`).
 *
 * `passwordHash` NUNCA sale del backend: el select público lo deja afuera
 * en el listado y el detalle lo descarta explícitamente.
 */

interface UserBase {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  isActive: boolean;
  roleId: number;
  role: { id: number; name: string };
  branchId: number | null;
  branch: { id: number; name: string } | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Fila de `GET /api/users`. */
export type UserListItem = UserBase;

/**
 * `GET /api/users/:id`: además de los datos trae los permisos EFECTIVOS
 * (los del rol, más o menos los overrides) y los overrides en crudo.
 */
export interface UserDetail extends UserBase {
  permissions: string[];
  overrides: Array<{ permissionCode: string; granted: boolean }>;
}

/** POST /api/users */
export interface CreateUserBody {
  username: string;
  password: string;
  fullName: string;
  email?: string | null;
  roleId: number;
  branchId?: number | null;
  isActive?: boolean;
}

/** PATCH /api/users/:id — al menos un campo. */
export interface UpdateUserBody {
  username?: string;
  fullName?: string;
  email?: string | null;
  roleId?: number;
  branchId?: number | null;
  isActive?: boolean;
}

/**
 * POST /api/users/:id/password.
 * `currentPassword` es obligatoria SOLO si es la propia cuenta.
 * Cambiarla revoca todas las sesiones abiertas de ese usuario.
 */
export interface ChangePasswordBody {
  currentPassword?: string;
  newPassword: string;
}

export interface Role {
  id: number;
  name: string;
  description: string | null;
  isSystem: boolean;
  /** Códigos de permiso que da el rol. */
  permissions: string[];
}

/** `GET /api/permissions`: ya vienen agrupados por módulo. */
export interface PermissionGroup {
  module: string;
  permissions: Array<{ code: string; description: string }>;
}

export interface PermissionOverride {
  permissionCode: string;
  granted: boolean;
  module?: string;
  description?: string;
}

/** GET y PUT de `/api/users/:id/permissions`. */
export interface OverridesResponse {
  overrides: PermissionOverride[];
  effectivePermissions: string[];
}

/** El body del PUT es un ARRAY pelado, no un objeto. */
export type PutOverridesBody = Array<{ permissionCode: string; granted: boolean }>;

export interface UsersQuery {
  page?: number;
  pageSize?: number;
  active?: boolean;
  roleId?: number;
  search?: string;
}
