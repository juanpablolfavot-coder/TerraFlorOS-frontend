import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { CustomerPicker } from "@/features/customers/CustomerPicker";
import type { CustomerListItem } from "@/features/customers/types";
import { getApiErrorMessage } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { useDocumentTitle } from "@/lib/hooks";
import { useQuotes } from "./api";
import { QuoteStatusBadge } from "./QuoteStatusBadge";
import { QUOTE_STATUS_LABEL, QUOTE_STATUSES, type QuotesQuery, type QuoteStatus } from "./types";

const PAGE_SIZE = 20;

export function QuotesPage() {
  useDocumentTitle("Presupuestos");

  const navigate = useNavigate();

  const [estado, setEstado] = useState<QuoteStatus | "all">("ACTIVE");
  const [cliente, setCliente] = useState<CustomerListItem | null>(null);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [estado, cliente, desde, hasta]);

  const query = useMemo<QuotesQuery>(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      ...(estado !== "all" ? { status: estado } : {}),
      ...(cliente !== null ? { customerId: cliente.id } : {}),
      ...(desde !== "" ? { dateFrom: desde } : {}),
      // Hasta el final del día elegido, si no se pierde el mismo día
      ...(hasta !== "" ? { dateTo: `${hasta}T23:59:59` } : {}),
    }),
    [page, estado, cliente, desde, hasta]
  );

  const { data, isPending, error } = useQuotes(query);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Presupuestos"
        description="Cotizaciones con precio congelado. No mueven stock ni caja hasta convertirse en venta."
        actions={<Button onClick={() => navigate("/presupuestos/nuevo")}>Nuevo presupuesto</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Select
          aria-label="Filtrar por estado"
          value={estado}
          onChange={(event) => setEstado(event.target.value as QuoteStatus | "all")}
        >
          <option value="all">Todos los estados</option>
          {QUOTE_STATUSES.map((valor) => (
            <option key={valor} value={valor}>
              {QUOTE_STATUS_LABEL[valor]}
            </option>
          ))}
        </Select>

        <Input
          type="date"
          aria-label="Desde"
          value={desde}
          onChange={(event) => setDesde(event.target.value)}
        />
        <Input
          type="date"
          aria-label="Hasta"
          value={hasta}
          onChange={(event) => setHasta(event.target.value)}
        />

        <div className="sm:col-span-2 xl:col-span-1">
          <CustomerPicker cliente={cliente} onChange={setCliente} />
        </div>
      </div>

      {error !== null && (
        <Alert tone="danger" title="No se pudieron cargar los presupuestos">
          {getApiErrorMessage(error)}
        </Alert>
      )}

      <Card flush>
        <Table>
          <THead>
            <TR>
              <TH>Número</TH>
              <TH>Cliente</TH>
              <TH>Fecha</TH>
              <TH>Vence</TH>
              <TH>Estado</TH>
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
                No hay presupuestos que coincidan con los filtros.
              </TableMessage>
            ) : (
              data.items.map((quote) => (
                <TR
                  key={quote.id}
                  interactive
                  onClick={() => navigate(`/presupuestos/${quote.id}`)}
                >
                  <TD className="font-mono text-xs text-stone-600">{quote.number}</TD>

                  <TD>
                    {quote.customer === null ? (
                      <span className="text-stone-400">Sin cliente</span>
                    ) : (
                      <span className="font-medium text-stone-900">{quote.customer.name}</span>
                    )}
                  </TD>

                  <TD className="text-stone-600">{formatDate(quote.createdAt)}</TD>

                  <TD className={quote.isExpired ? "font-medium text-amber-700" : "text-stone-500"}>
                    {formatDate(quote.expiresAt)}
                  </TD>

                  <TD>
                    <QuoteStatusBadge status={quote.status} isExpired={quote.isExpired} />
                  </TD>

                  <TD align="right" numeric className="font-medium text-stone-900">
                    {formatMoney(quote.total)}
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
