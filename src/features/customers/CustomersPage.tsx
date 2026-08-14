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
import { useCustomerList } from "./api";
import { CUSTOMER_SEGMENTS, SEGMENT_LABEL, type CustomerSegment, type CustomersQuery } from "./types";

const PAGE_SIZE = 20;

type EstadoFiltro = "all" | "active" | "inactive";

export function CustomersPage() {
  useDocumentTitle("Clientes");

  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [segmento, setSegmento] = useState<CustomerSegment | "all">("all");
  const [estado, setEstado] = useState<EstadoFiltro>("active");
  const [page, setPage] = useState(1);

  const searchDebounced = useDebouncedValue(search);

  useEffect(() => {
    setPage(1);
  }, [searchDebounced, segmento, estado]);

  const query = useMemo<CustomersQuery>(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      ...(searchDebounced.trim() !== "" ? { search: searchDebounced.trim() } : {}),
      ...(segmento !== "all" ? { segment: segmento } : {}),
      ...(estado !== "all" ? { isActive: estado === "active" } : {}),
    }),
    [page, searchDebounced, segmento, estado]
  );

  const { data, isPending, error } = useCustomerList(query);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Clientes"
        description="Padrón de clientes del vivero."
        actions={
          <Can permission={PERMISSIONS.CUSTOMERS_MANAGE}>
            <Button onClick={() => navigate("/clientes/nuevo")}>Nuevo cliente</Button>
          </Can>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SearchInput
          className="sm:col-span-2"
          placeholder="Nombre, teléfono, email o CUIT…"
          aria-label="Buscar clientes"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <Select
          aria-label="Filtrar por segmento"
          value={segmento}
          onChange={(event) => setSegmento(event.target.value as CustomerSegment | "all")}
        >
          <option value="all">Todos los segmentos</option>
          {CUSTOMER_SEGMENTS.map((valor) => (
            <option key={valor} value={valor}>
              {SEGMENT_LABEL[valor]}
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
        <Alert tone="danger" title="No se pudieron cargar los clientes">
          {getApiErrorMessage(error)}
        </Alert>
      )}

      <Card flush>
        <Table>
          <THead>
            <TR>
              <TH>Cliente</TH>
              <TH>Teléfono</TH>
              <TH>Email</TH>
              <TH>Segmento</TH>
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
                No hay clientes que coincidan con la búsqueda.
              </TableMessage>
            ) : (
              data.items.map((cliente) => (
                <TR key={cliente.id} interactive onClick={() => navigate(`/clientes/${cliente.id}`)}>
                  <TD>
                    <span className="font-medium text-stone-900">{cliente.name}</span>
                    {cliente.taxId !== null && (
                      <span className="block font-mono text-xs text-stone-500">
                        {cliente.taxId}
                      </span>
                    )}
                  </TD>

                  <TD className="text-stone-600">
                    {cliente.phone ?? cliente.whatsapp ?? "—"}
                    {cliente.phone !== null && cliente.whatsapp !== null && (
                      <span className="block text-xs text-stone-400">
                        WhatsApp {cliente.whatsapp}
                      </span>
                    )}
                  </TD>

                  <TD className="text-stone-500">{cliente.email ?? "—"}</TD>

                  <TD>
                    <Badge tone={cliente.segment === "ocasional" ? "neutral" : "brand"}>
                      {SEGMENT_LABEL[cliente.segment] ?? cliente.segment}
                    </Badge>
                  </TD>

                  <TD align="right">
                    {cliente.isActive ? (
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
