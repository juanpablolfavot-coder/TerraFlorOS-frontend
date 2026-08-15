import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  Card,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  Spinner,
  Table,
  TableMessage,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import { useAuth } from "@/features/auth";
import { getApiErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useDebouncedValue, useDocumentTitle } from "@/lib/hooks";
import { useRoles, useUsers } from "./api";
import type { UsersQuery } from "./types";

const PAGE_SIZE = 20;

type EstadoFiltro = "all" | "active" | "inactive";

export function UsersPage() {
  useDocumentTitle("Usuarios");

  const navigate = useNavigate();
  const { user } = useAuth();

  const [search, setSearch] = useState("");
  const [rol, setRol] = useState<string>("all");
  const [estado, setEstado] = useState<EstadoFiltro>("active");
  const [page, setPage] = useState(1);

  const searchDebounced = useDebouncedValue(search);
  const roles = useRoles();

  useEffect(() => {
    setPage(1);
  }, [searchDebounced, rol, estado]);

  const query = useMemo<UsersQuery>(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      ...(searchDebounced.trim() !== "" ? { search: searchDebounced.trim() } : {}),
      ...(rol !== "all" ? { roleId: Number(rol) } : {}),
      ...(estado !== "all" ? { active: estado === "active" } : {}),
    }),
    [page, searchDebounced, rol, estado]
  );

  const { data, isPending, error } = useUsers(query);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Usuarios"
        description="Altas, roles y permisos individuales."
        actions={<Button onClick={() => navigate("/usuarios/nuevo")}>Nuevo usuario</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SearchInput
          className="sm:col-span-2"
          placeholder="Nombre o usuario…"
          aria-label="Buscar usuarios"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <Select
          aria-label="Filtrar por rol"
          value={rol}
          onChange={(event) => setRol(event.target.value)}
        >
          <option value="all">Todos los roles</option>
          {(roles.data ?? []).map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Filtrar por estado"
          value={estado}
          onChange={(event) => setEstado(event.target.value as EstadoFiltro)}
        >
          <option value="active">Solo activos</option>
          <option value="inactive">Solo inactivos</option>
          <option value="all">Todos</option>
        </Select>
      </div>

      {error !== null && (
        <Alert tone="danger" title="No se pudieron cargar los usuarios">
          {getApiErrorMessage(error)}
        </Alert>
      )}

      <Card flush>
        <Table>
          <THead>
            <TR>
              <TH>Nombre</TH>
              <TH>Usuario</TH>
              <TH>Rol</TH>
              <TH>Sucursal</TH>
              <TH>Último ingreso</TH>
              <TH align="right">Estado</TH>
            </TR>
          </THead>

          <TBody>
            {isPending ? (
              <TableMessage colSpan={6}>
                <Spinner />
              </TableMessage>
            ) : data === undefined || data.items.length === 0 ? (
              <TableMessage colSpan={6}>
                No hay usuarios que coincidan con los filtros.
              </TableMessage>
            ) : (
              data.items.map((usuario) => (
                <TR
                  key={usuario.id}
                  interactive
                  onClick={() => navigate(`/usuarios/${usuario.id}`)}
                >
                  <TD>
                    <span className="font-medium text-stone-900">{usuario.fullName}</span>
                    {usuario.id === user?.id && (
                      <Badge tone="brand" className="ml-2">
                        Vos
                      </Badge>
                    )}
                    {usuario.email !== null && (
                      <span className="block text-xs text-stone-500">{usuario.email}</span>
                    )}
                  </TD>

                  <TD className="font-mono text-xs text-stone-600">{usuario.username}</TD>

                  <TD className="text-stone-600">{usuario.role.name}</TD>

                  <TD className="text-stone-500">{usuario.branch?.name ?? "—"}</TD>

                  <TD className="text-stone-500">
                    {usuario.lastLoginAt === null ? "Nunca" : formatDateTime(usuario.lastLoginAt)}
                  </TD>

                  <TD align="right">
                    {usuario.isActive ? (
                      <Badge tone="success">Activo</Badge>
                    ) : (
                      <Badge tone="neutral">Inactivo</Badge>
                    )}
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>

        {data !== undefined && (
          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onPageChange={setPage}
          />
        )}
      </Card>
    </div>
  );
}
