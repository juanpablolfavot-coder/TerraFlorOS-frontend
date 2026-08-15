import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Alert,
  Badge,
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
import { formatDateTime, formatMoney, formatNumber } from "@/lib/format";
import { useDocumentTitle } from "@/lib/hooks";
import { useRegisters, useSessionHistory } from "./api";
import { CashDifference } from "./CashDifference";
import type { SessionsQuery } from "./types";

const PAGE_SIZE = 20;

/**
 * Historial de cajas: el lugar donde se revisa cómo cerró cada turno.
 * El dato estrella es la diferencia de arqueo, así que va destacada.
 */
export function CashHistoryPage() {
  useDocumentTitle("Historial de cajas");

  const navigate = useNavigate();

  const [caja, setCaja] = useState("all");
  const [estado, setEstado] = useState<"all" | "open" | "closed">("all");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [page, setPage] = useState(1);

  // Leer las cajas alcanza con sales.create o cash.open: quien mira el
  // historial solo con reports.view no puede, y ahí no hay filtro
  const registers = useRegisters();

  useEffect(() => {
    setPage(1);
  }, [caja, estado, desde, hasta]);

  const query = useMemo<SessionsQuery>(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      ...(caja !== "all" ? { registerId: Number(caja) } : {}),
      ...(estado !== "all" ? { status: estado } : {}),
      ...(desde !== "" ? { dateFrom: desde } : {}),
      // Hasta el final del día elegido, si no se pierde el mismo día
      ...(hasta !== "" ? { dateTo: `${hasta}T23:59:59` } : {}),
    }),
    [page, caja, estado, desde, hasta]
  );

  const { data, isPending, error } = useSessionHistory(query);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Historial de cajas"
        description="Cómo cerró cada turno: arqueo, ventas y diferencias."
        actions={
          <Can
            anyOf={[
              PERMISSIONS.SALES_CREATE,
              PERMISSIONS.CASH_OPEN,
              PERMISSIONS.CASH_MOVEMENT,
              PERMISSIONS.CASH_CLOSE,
            ]}
          >
            <Link to="/caja" className="text-sm font-medium text-stone-500 hover:text-stone-800">
              Ir a la caja actual
            </Link>
          </Can>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(registers.data?.length ?? 0) > 1 && (
          <Select
            aria-label="Filtrar por caja"
            value={caja}
            onChange={(event) => setCaja(event.target.value)}
          >
            <option value="all">Todas las cajas</option>
            {(registers.data ?? []).map((registro) => (
              <option key={registro.id} value={registro.id}>
                {registro.name}
              </option>
            ))}
          </Select>
        )}

        <Select
          aria-label="Filtrar por estado"
          value={estado}
          onChange={(event) => setEstado(event.target.value as "all" | "open" | "closed")}
        >
          <option value="all">Abiertas y cerradas</option>
          <option value="closed">Solo cerradas</option>
          <option value="open">Solo abiertas</option>
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
      </div>

      {error !== null && (
        <Alert tone="danger" title="No se pudo cargar el historial">
          {getApiErrorMessage(error)}
        </Alert>
      )}

      <Card flush>
        <Table>
          <THead>
            <TR>
              <TH>Caja</TH>
              <TH>Apertura</TH>
              <TH>Cierre</TH>
              <TH align="right">Ventas</TH>
              <TH align="right">Esperado</TH>
              <TH align="right">Contado</TH>
              <TH align="right">Diferencia</TH>
            </TR>
          </THead>

          <TBody>
            {isPending ? (
              <TableMessage colSpan={7}>
                <Spinner />
              </TableMessage>
            ) : data === undefined || data.items.length === 0 ? (
              <TableMessage colSpan={7}>
                No hay turnos que coincidan con los filtros.
              </TableMessage>
            ) : (
              data.items.map((sesion) => (
                <TR
                  key={sesion.id}
                  interactive
                  onClick={() => navigate(`/caja/historial/${sesion.id}`)}
                >
                  <TD>
                    <span className="font-medium text-stone-900">{sesion.cashRegister.name}</span>
                    {sesion.isOpen && (
                      <Badge tone="brand" className="ml-2">
                        Abierta
                      </Badge>
                    )}
                  </TD>

                  <TD className="text-stone-600">
                    {formatDateTime(sesion.openedAt)}
                    <span className="block text-xs text-stone-400">
                      {sesion.openedBy.fullName}
                    </span>
                  </TD>

                  <TD className="text-stone-600">
                    {sesion.closedAt === null ? (
                      <span className="text-stone-400">En curso</span>
                    ) : (
                      <>
                        {formatDateTime(sesion.closedAt)}
                        <span className="block text-xs text-stone-400">
                          {sesion.closedBy?.fullName ?? "—"}
                        </span>
                      </>
                    )}
                  </TD>

                  <TD align="right" numeric className="text-stone-700">
                    {formatMoney(sesion.sales?.total)}
                    <span className="block text-xs text-stone-400">
                      {formatNumber(sesion.sales?.count)}{" "}
                      {sesion.sales?.count === 1 ? "venta" : "ventas"}
                    </span>
                  </TD>

                  <TD align="right" numeric className="text-stone-600">
                    {sesion.expectedAmount === null ? "—" : formatMoney(sesion.expectedAmount)}
                  </TD>

                  <TD align="right" numeric className="text-stone-600">
                    {sesion.countedAmount === null ? "—" : formatMoney(sesion.countedAmount)}
                  </TD>

                  <TD align="right">
                    <CashDifference value={sesion.difference} />
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
