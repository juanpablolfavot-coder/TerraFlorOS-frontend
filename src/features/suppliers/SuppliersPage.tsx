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
import { Can, PERMISSIONS } from "@/features/auth";
import { getApiErrorMessage } from "@/lib/api";
import { useDebouncedValue, useDocumentTitle } from "@/lib/hooks";
import { useSupplierList } from "./api";
import type { SuppliersQuery } from "./types";

const PAGE_SIZE = 20;

type EstadoFiltro = "all" | "active" | "inactive";

export function SuppliersPage() {
  useDocumentTitle("Proveedores");

  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState<EstadoFiltro>("active");
  const [page, setPage] = useState(1);

  const searchDebounced = useDebouncedValue(search);

  useEffect(() => {
    setPage(1);
  }, [searchDebounced, estado]);

  const query = useMemo<SuppliersQuery>(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      ...(searchDebounced.trim() !== "" ? { search: searchDebounced.trim() } : {}),
      ...(estado !== "all" ? { isActive: estado === "active" } : {}),
    }),
    [page, searchDebounced, estado]
  );

  const { data, isPending, error } = useSupplierList(query);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Proveedores"
        description="Padrón de proveedores del vivero."
        actions={
          <Can permission={PERMISSIONS.SUPPLIERS_MANAGE}>
            <Button onClick={() => navigate("/proveedores/nuevo")}>Nuevo proveedor</Button>
          </Can>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SearchInput
          className="sm:col-span-2 xl:col-span-2"
          placeholder="Razón social, nombre comercial o CUIT…"
          aria-label="Buscar proveedores"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

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
        <Alert tone="danger" title="No se pudieron cargar los proveedores">
          {getApiErrorMessage(error)}
        </Alert>
      )}

      <Card flush>
        <Table>
          <THead>
            <TR>
              <TH>Proveedor</TH>
              <TH>CUIT</TH>
              <TH>Contacto</TH>
              <TH>Condiciones de pago</TH>
              <TH align="right">Estado</TH>
            </TR>
          </THead>

          <TBody>
            {isPending ? (
              <TableMessage colSpan={5}>
                <Spinner />
              </TableMessage>
            ) : data === undefined || data.items.length === 0 ? (
              <TableMessage colSpan={5}>
                No hay proveedores que coincidan con la búsqueda.
              </TableMessage>
            ) : (
              data.items.map((proveedor) => (
                <TR
                  key={proveedor.id}
                  interactive
                  onClick={() => navigate(`/proveedores/${proveedor.id}`)}
                >
                  <TD>
                    <span className="font-medium text-stone-900">
                      {proveedor.tradeName ?? proveedor.legalName}
                    </span>
                    {proveedor.tradeName !== null && (
                      <span className="block text-xs text-stone-500">{proveedor.legalName}</span>
                    )}
                  </TD>

                  <TD className="font-mono text-xs text-stone-500">{proveedor.taxId ?? "—"}</TD>

                  <TD className="text-stone-600">
                    {proveedor.phone ?? proveedor.whatsapp ?? proveedor.email ?? "—"}
                    {proveedor.contactName !== null && (
                      <span className="block text-xs text-stone-400">{proveedor.contactName}</span>
                    )}
                  </TD>

                  <TD className="text-stone-500">{proveedor.paymentTerms ?? "—"}</TD>

                  <TD align="right">
                    {proveedor.isActive ? (
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
