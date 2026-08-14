import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  Input,
  PageHeader,
  Pagination,
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
import { formatDate, formatMoney } from "@/lib/format";
import { useDocumentTitle } from "@/lib/hooks";
import { usePurchases, useSuppliers } from "./api";
import { PurchaseStatusBadge } from "./PurchaseStatusBadge";
import { PURCHASE_STATUS_LABEL, type PurchaseStatus, type PurchasesQuery } from "./types";

const PAGE_SIZE = 20;

const ESTADOS = Object.keys(PURCHASE_STATUS_LABEL) as PurchaseStatus[];

export function PurchasesPage() {
  useDocumentTitle("Compras");

  const navigate = useNavigate();

  const [status, setStatus] = useState<PurchaseStatus | "">("");
  const [supplierId, setSupplierId] = useState<number | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [status, supplierId, dateFrom, dateTo]);

  const query = useMemo<PurchasesQuery>(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      ...(status !== "" ? { status } : {}),
      ...(supplierId !== "" ? { supplierId } : {}),
      ...(dateFrom !== "" ? { dateFrom } : {}),
      ...(dateTo !== "" ? { dateTo } : {}),
    }),
    [page, status, supplierId, dateFrom, dateTo]
  );

  const { data, isPending, error } = usePurchases(query);
  const proveedores = useSuppliers();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Compras"
        description="Órdenes de compra y recepción de mercadería."
        actions={
          <Can permission={PERMISSIONS.PURCHASES_MANAGE}>
            <Link
              to="/reposicion"
              className="text-sm font-medium text-stone-500 hover:text-stone-800"
            >
              A reponer
            </Link>
            <Button onClick={() => navigate("/compras/nueva")}>Nueva compra</Button>
          </Can>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Select
          aria-label="Filtrar por estado"
          value={status}
          onChange={(event) => setStatus(event.target.value as PurchaseStatus | "")}
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map((estado) => (
            <option key={estado} value={estado}>
              {PURCHASE_STATUS_LABEL[estado]}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Filtrar por proveedor"
          value={supplierId}
          onChange={(event) =>
            setSupplierId(event.target.value === "" ? "" : Number(event.target.value))
          }
          disabled={proveedores.isPending}
        >
          <option value="">Todos los proveedores</option>
          {(proveedores.data ?? []).map((proveedor) => (
            <option key={proveedor.id} value={proveedor.id}>
              {proveedor.tradeName ?? proveedor.legalName}
            </option>
          ))}
        </Select>

        <Input
          type="date"
          aria-label="Desde"
          value={dateFrom}
          onChange={(event) => setDateFrom(event.target.value)}
        />
        <Input
          type="date"
          aria-label="Hasta"
          value={dateTo}
          onChange={(event) => setDateTo(event.target.value)}
        />
      </div>

      {error !== null && (
        <Alert tone="danger" title="No se pudieron cargar las compras">
          {getApiErrorMessage(error)}
        </Alert>
      )}

      <Card flush>
        <Table>
          <THead>
            <TR>
              <TH>Orden</TH>
              <TH>Proveedor</TH>
              <TH>Fecha</TH>
              <TH>Estado</TH>
              <TH align="right">Ítems</TH>
              <TH align="right">Total</TH>
            </TR>
          </THead>

          <TBody>
            {isPending ? (
              <TableMessage colSpan={6}>
                <Spinner />
              </TableMessage>
            ) : data === undefined || data.items.length === 0 ? (
              <TableMessage colSpan={6}>
                No hay compras que coincidan con los filtros.
              </TableMessage>
            ) : (
              data.items.map((compra) => (
                <TR
                  key={compra.id}
                  interactive
                  onClick={() => navigate(`/compras/${compra.id}`)}
                >
                  <TD className="font-mono text-xs text-stone-500">#{compra.id}</TD>
                  <TD className="font-medium text-stone-900">
                    {compra.supplier.tradeName ?? compra.supplier.legalName}
                  </TD>
                  <TD className="text-stone-500">{formatDate(compra.orderDate)}</TD>
                  <TD>
                    <PurchaseStatusBadge status={compra.status} />
                  </TD>
                  <TD align="right" numeric className="text-stone-500">
                    {compra._count.items}
                  </TD>
                  <TD align="right" numeric className="font-medium text-stone-900">
                    {formatMoney(compra.total)}
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
