import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  Collapsible,
  LoadingBlock,
  Select,
} from "@/components/ui";
import { PERMISSIONS, useAuth } from "@/features/auth";
import { getApiErrorMessage } from "@/lib/api";
import { usePermissionCatalog, useReplaceOverrides, useRoles, useUserPermissions } from "./api";
import type { UserDetail } from "./types";

/** Estado de un permiso para esta persona. */
type Estado = "rol" | "concedido" | "revocado";

const ETIQUETA: Record<Estado, string> = {
  rol: "Según el rol",
  concedido: "Conceder",
  revocado: "Revocar",
};

/** Nombre legible de cada módulo del backend. */
const MODULO: Record<string, string> = {
  products: "Productos",
  prices: "Precios",
  stock: "Inventario",
  purchases: "Compras",
  suppliers: "Proveedores",
  sales: "Ventas",
  cash: "Caja",
  customers: "Clientes",
  tasks: "Tareas",
  reports: "Reportes",
  users: "Usuarios",
  settings: "Configuración",
  audit: "Auditoría",
};

/**
 * Permisos efectivos y editor de overrides.
 *
 * El efectivo es: lo que da el rol, más los permisos concedidos a mano,
 * menos los revocados. El PUT reemplaza TODOS los overrides, así que
 * siempre se manda la lista completa de los que no están "según el rol".
 */
export function UserPermissionsCard({ usuario }: { usuario: UserDetail }) {
  const { user } = useAuth();
  const esPropia = usuario.id === user?.id;

  const catalogo = usePermissionCatalog();
  const roles = useRoles();
  const permisos = useUserPermissions(usuario.id);
  const guardar = useReplaceOverrides(usuario.id);

  /** Overrides en edición: código → concedido/revocado. */
  const [cambios, setCambios] = useState<Map<string, boolean> | null>(null);

  const guardados = useMemo(() => {
    const mapa = new Map<string, boolean>();
    for (const override of permisos.data?.overrides ?? usuario.overrides) {
      mapa.set(override.permissionCode, override.granted);
    }
    return mapa;
  }, [permisos.data, usuario.overrides]);

  const actuales = cambios ?? guardados;

  const delRol = useMemo(
    () => new Set(roles.data?.find((rol) => rol.id === usuario.roleId)?.permissions ?? []),
    [roles.data, usuario.roleId]
  );

  /** Efectivo con los cambios sin guardar ya aplicados. */
  const efectivos = useMemo(() => {
    const resultado = new Set(delRol);
    for (const [codigo, concedido] of actuales) {
      if (concedido) resultado.add(codigo);
      else resultado.delete(codigo);
    }
    return resultado;
  }, [delRol, actuales]);

  const estadoDe = (codigo: string): Estado => {
    const override = actuales.get(codigo);
    if (override === undefined) return "rol";
    return override ? "concedido" : "revocado";
  };

  const cambiar = (codigo: string, estado: Estado) => {
    const siguiente = new Map(actuales);
    if (estado === "rol") siguiente.delete(codigo);
    else siguiente.set(codigo, estado === "concedido");
    setCambios(siguiente);
  };

  /**
   * Guarda anti-bloqueo, la misma del backend: nadie puede quitarse su
   * propio `users.manage`. Se evalúa sobre lo que quedaría, no sobre el
   * control tocado, porque el rol también puede darlo.
   */
  const seQuedariaSinGestion = esPropia && !efectivos.has(PERMISSIONS.USERS_MANAGE);

  const hayCambios = useMemo(() => {
    if (cambios === null) return false;
    if (cambios.size !== guardados.size) return true;
    for (const [codigo, valor] of cambios) {
      if (guardados.get(codigo) !== valor) return true;
    }
    return false;
  }, [cambios, guardados]);

  const aplicar = () => {
    if (seQuedariaSinGestion) return;
    guardar.mutate(
      [...actuales.entries()].map(([permissionCode, granted]) => ({ permissionCode, granted })),
      { onSuccess: () => setCambios(null) }
    );
  };

  if (catalogo.isPending || permisos.isPending || roles.isPending) {
    return (
      <Card>
        <LoadingBlock label="Cargando permisos…" />
      </Card>
    );
  }

  if (catalogo.error !== null || permisos.error !== null) {
    return (
      <Card>
        <Alert tone="danger" title="No se pudieron cargar los permisos">
          {getApiErrorMessage(catalogo.error ?? permisos.error)}
        </Alert>
      </Card>
    );
  }

  return (
    <Card className="space-y-6">
      <CardHeader
        title="Permisos"
        description={`${efectivos.size} permisos efectivos: los del rol ${usuario.role.name}, más los concedidos a mano y menos los revocados.`}
      />

      <div className="space-y-3">
        {(catalogo.data ?? []).map((grupo) => {
          const concedidosDelGrupo = grupo.permissions.filter((p) => efectivos.has(p.code)).length;
          const conOverride = grupo.permissions.filter((p) => actuales.has(p.code)).length;

          return (
            <Collapsible
              key={grupo.module}
              title={MODULO[grupo.module] ?? grupo.module}
              description={`${concedidosDelGrupo} de ${grupo.permissions.length} habilitados`}
              badge={conOverride > 0 ? <Badge tone="brand">{conOverride} a mano</Badge> : undefined}
            >
              <ul className="divide-y divide-stone-100">
                {grupo.permissions.map((permiso) => {
                  const estado = estadoDe(permiso.code);
                  const activo = efectivos.has(permiso.code);
                  // Sobre la propia cuenta, users.manage no se puede soltar
                  const bloqueado =
                    esPropia && permiso.code === PERMISSIONS.USERS_MANAGE && estado !== "revocado";

                  return (
                    <li
                      key={permiso.code}
                      className="flex flex-wrap items-center justify-between gap-4 py-3"
                    >
                      <div className="min-w-0 space-y-1">
                        <p className="flex flex-wrap items-center gap-2">
                          <span className="text-stone-800">{permiso.description}</span>
                          {activo ? (
                            estado === "concedido" ? (
                              <Badge tone="brand">Concedido aparte</Badge>
                            ) : (
                              <Badge tone="success">Del rol</Badge>
                            )
                          ) : estado === "revocado" ? (
                            <Badge tone="warning">Revocado</Badge>
                          ) : (
                            <Badge tone="neutral">Sin permiso</Badge>
                          )}
                        </p>
                        <p className="font-mono text-xs text-stone-400">{permiso.code}</p>
                      </div>

                      <div className="w-48 shrink-0">
                        <Select
                          aria-label={`Permiso ${permiso.code}`}
                          value={estado}
                          disabled={bloqueado}
                          title={
                            bloqueado
                              ? "No podés quitarte tu propia gestión de usuarios"
                              : undefined
                          }
                          onChange={(event) => cambiar(permiso.code, event.target.value as Estado)}
                        >
                          {/* Qué da el rol ya se ve en la etiqueta de la izquierda */}
                          <option value="rol">{ETIQUETA.rol}</option>
                          <option value="concedido">{ETIQUETA.concedido}</option>
                          <option value="revocado">{ETIQUETA.revocado}</option>
                        </Select>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Collapsible>
          );
        })}
      </div>

      {seQuedariaSinGestion && (
        <Alert tone="danger" title="Te quedarías sin gestión de usuarios">
          Con estos cambios perderías <code>users.manage</code> y no podrías volver a entrar a esta
          pantalla. El backend también lo rechaza.
        </Alert>
      )}

      {guardar.error !== null && (
        <Alert tone="danger" title="No se pudieron guardar los permisos">
          {getApiErrorMessage(guardar.error)}
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-stone-100 pt-6">
        <Button
          onClick={aplicar}
          loading={guardar.isPending}
          disabled={!hayCambios || seQuedariaSinGestion}
        >
          Guardar permisos
        </Button>
        {hayCambios && (
          <Button variant="secondary" onClick={() => setCambios(null)} disabled={guardar.isPending}>
            Descartar cambios
          </Button>
        )}
        {!hayCambios && (
          <p className="text-sm text-stone-500">
            Los cambios se aplican al guardar; reemplazan todos los ajustes individuales.
          </p>
        )}
      </div>
    </Card>
  );
}
