import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Paginated } from "@/features/products/types";
import type {
  ChangePasswordBody,
  CreateUserBody,
  OverridesResponse,
  PermissionGroup,
  PutOverridesBody,
  Role,
  UpdateUserBody,
  UserDetail,
  UserListItem,
  UsersQuery,
} from "./types";

export const userKeys = {
  all: ["users"] as const,
  list: (query: UsersQuery) => ["users", "list", query] as const,
  detail: (id: number) => ["users", "detail", id] as const,
  permissions: (id: number) => ["users", "permissions", id] as const,
  roles: ["roles"] as const,
  catalog: ["permissions", "catalog"] as const,
};

/** Todo el módulo pide `users.manage`. */
export function useUsers(query: UsersQuery) {
  return useQuery({
    queryKey: userKeys.list(query),
    queryFn: async () => {
      const { data } = await api.get<Paginated<UserListItem>>("/api/users", { params: query });
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useUser(id: number | null) {
  return useQuery({
    queryKey: userKeys.detail(id ?? 0),
    enabled: id !== null,
    queryFn: async () => {
      const { data } = await api.get<UserDetail>(`/api/users/${id}`);
      return data;
    },
  });
}

/** Los roles casi no cambian y se usan en varios lugares de la pantalla. */
export function useRoles() {
  return useQuery({
    queryKey: userKeys.roles,
    queryFn: async () => {
      const { data } = await api.get<Role[]>("/api/roles");
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

/** Catálogo de permisos, ya agrupado por módulo por el backend. */
export function usePermissionCatalog() {
  return useQuery({
    queryKey: userKeys.catalog,
    queryFn: async () => {
      const { data } = await api.get<PermissionGroup[]>("/api/permissions");
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

function useInvalidarUsuarios() {
  const queryClient = useQueryClient();
  return (id?: number) => {
    void queryClient.invalidateQueries({ queryKey: userKeys.all });
    if (id !== undefined) {
      void queryClient.invalidateQueries({ queryKey: userKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: userKeys.permissions(id) });
    }
  };
}

/** 409 si el username ya existe. */
export function useCreateUser() {
  const invalidar = useInvalidarUsuarios();

  return useMutation({
    mutationFn: async (body: CreateUserBody) => {
      const { data } = await api.post<UserListItem>("/api/users", body);
      return data;
    },
    onSuccess: (usuario) => invalidar(usuario.id),
  });
}

/**
 * Edición. El backend rechaza con 400 desactivarse a uno mismo o
 * asignarse un rol que le quite `users.manage`.
 */
export function useUpdateUser(id: number) {
  const invalidar = useInvalidarUsuarios();

  return useMutation({
    mutationFn: async (body: UpdateUserBody) => {
      const { data } = await api.patch<UserDetail>(`/api/users/${id}`, body);
      return data;
    },
    onSuccess: () => invalidar(id),
  });
}

/** Baja lógica. 400 si es la propia cuenta. Revoca sus sesiones. */
export function useDeleteUser() {
  const invalidar = useInvalidarUsuarios();

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/users/${id}`);
      return id;
    },
    onSuccess: (id) => invalidar(id),
  });
}

/**
 * Cambio de contraseña. Si es la propia cuenta el backend exige
 * `currentPassword`; si es la de otro alcanza con `users.manage`.
 * En los dos casos se caen todas las sesiones del usuario afectado.
 */
export function useChangePassword(id: number) {
  return useMutation({
    mutationFn: async (body: ChangePasswordBody) => {
      await api.post(`/api/users/${id}/password`, body);
    },
  });
}

export function useUserPermissions(id: number | null) {
  return useQuery({
    queryKey: userKeys.permissions(id ?? 0),
    enabled: id !== null,
    queryFn: async () => {
      const { data } = await api.get<OverridesResponse>(`/api/users/${id}/permissions`);
      return data;
    },
  });
}

/** El PUT reemplaza TODOS los overrides: se manda la lista completa. */
export function useReplaceOverrides(id: number) {
  const invalidar = useInvalidarUsuarios();

  return useMutation({
    mutationFn: async (body: PutOverridesBody) => {
      const { data } = await api.put<OverridesResponse>(`/api/users/${id}/permissions`, body);
      return data;
    },
    onSuccess: () => invalidar(id),
  });
}

/**
 * Sucursales para el selector.
 *
 * El backend NO expone un listado de sucursales, así que se arman con las
 * que ya tienen asignadas otros usuarios. Alcanza para operar (las
 * sucursales existentes están en uso) pero no puede ofrecer una recién
 * creada que todavía no tenga gente: eso queda avisado en el formulario.
 */
export function useBranchOptions() {
  return useQuery({
    queryKey: ["users", "branches"] as const,
    queryFn: async () => {
      const { data } = await api.get<Paginated<UserListItem>>("/api/users", {
        params: { pageSize: 100 },
      });
      const porId = new Map<number, string>();
      for (const usuario of data.items) {
        if (usuario.branch !== null) porId.set(usuario.branch.id, usuario.branch.name);
      }
      return [...porId.entries()].map(([id, name]) => ({ id, name }));
    },
    staleTime: 5 * 60_000,
  });
}
