import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Badge,
  Card,
  CardHeader,
  EmptyState,
  LoadingBlock,
  PageHeader,
  StatCard,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api";
import { formatDateTime, formatMoney, formatNumber, toNumber } from "@/lib/format";
import { useDocumentTitle } from "@/lib/hooks";
import { useSessionDetail } from "./api";
import { CashDifferenceBlock } from "./CashDifference";
import { CashMovementsTable } from "./CashMovementsTable";

/** Detalle de un turno de caja, esté abierto o cerrado. */
export function CashSessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const sessionId = Number(id);
  const navigate = useNavigate();

  const detalle = useSessionDetail(sessionId);

  useDocumentTitle(
    detalle.data === undefined
      ? "Turno de caja"
      : `${detalle.data.session.cashRegister.name} · ${formatDateTime(detalle.data.session.openedAt)}`
  );

  if (detalle.isPending) return <LoadingBlock label="Cargando el turno…" />;

  if (detalle.error !== null || detalle.data === undefined) {
    return (
      <div className="space-y-8">
        <PageHeader title="Turno de caja" />
        <Alert tone="danger" title="No se pudo cargar el turno">
          {getApiErrorMessage(detalle.error)}
        </Alert>
      </div>
    );
  }

  const { session, summary, movements, sales } = detalle.data;
  const abierta = session.isOpen;

  /**
   * Ventas del turno. El detalle NO trae el agregado `sales` dentro de
   * `session` (eso es del listado): se cuenta acá desde el array, con el
   * mismo criterio que usa el backend en el listado — solo las
   * COMPLETED, porque una anulada ya no es plata del turno.
   */
  const completadas = sales.filter((venta) => venta.status !== "VOIDED");
  const vendido = completadas.reduce((suma, venta) => suma + toNumber(venta.total), 0);

  const dato = (etiqueta: string, valor: string, secundario?: string) => (
    <div className="space-y-1">
      <dt className="text-sm text-stone-500">{etiqueta}</dt>
      <dd className="text-stone-800">{valor}</dd>
      {secundario !== undefined && <dd className="text-xs text-stone-400">{secundario}</dd>}
    </div>
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title={session.cashRegister.name}
        description={`Turno del ${formatDateTime(session.openedAt)}`}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {abierta ? <Badge tone="brand">Abierta</Badge> : <Badge tone="neutral">Cerrada</Badge>}
            <Link
              to="/caja/historial"
              className="text-sm font-medium text-stone-500 hover:text-stone-800"
            >
              Volver al historial
            </Link>
          </div>
        }
      />

      <Card className="space-y-6">
        <CardHeader title="Turno" />
        <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {dato("Abrió", session.openedBy.fullName, formatDateTime(session.openedAt))}
          {dato(
            "Cerró",
            abierta ? "En curso" : (session.closedBy?.fullName ?? "—"),
            abierta ? undefined : formatDateTime(session.closedAt)
          )}
          {dato("Ventas del turno", formatNumber(completadas.length), formatMoney(vendido))}
          {dato("Movimientos", formatNumber(summary.movementsCount))}
        </dl>
      </Card>

      {/* Arqueo */}
      <Card className="space-y-6">
        <CardHeader
          title="Arqueo"
          description={
            abierta
              ? "El turno sigue abierto: el esperado se calcula en vivo y todavía no hay conteo."
              : "Lo que debía haber en el cajón contra lo que se contó al cerrar."
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Efectivo inicial" value={formatMoney(session.openingAmount)} />
          <StatCard
            label="Efectivo esperado"
            value={formatMoney(abierta ? summary.expectedCash : session.expectedAmount)}
            tone="brand"
          />
          <StatCard
            label="Efectivo contado"
            value={abierta ? "—" : formatMoney(session.countedAmount)}
          />
          {abierta || session.difference === null ? (
            <StatCard label="Diferencia" value="—" />
          ) : (
            <div className="sm:col-span-1">
              <CashDifferenceBlock value={session.difference} />
            </div>
          )}
        </div>

        {summary.changeGiven > 0 && (
          <p className="border-t border-stone-100 pt-5 text-sm text-stone-500">
            El efectivo de la tabla de medios de pago es lo que entregaron los clientes. Se
            devolvieron{" "}
            <span className="tabular font-medium text-stone-700">
              {formatMoney(summary.changeGiven)}
            </span>{" "}
            de vuelto, ya descontados del efectivo esperado.
          </p>
        )}

        {session.notes !== null && (
          <div className="space-y-1 border-t border-stone-100 pt-5">
            <p className="text-sm text-stone-500">Notas del cierre</p>
            <p className="text-sm whitespace-pre-line text-stone-700">{session.notes}</p>
          </div>
        )}
      </Card>

      {/* Ventas por método de pago */}
      <Card flush>
        <div className="p-6 sm:p-8">
          <CardHeader
            title="Ventas por medio de pago"
            description="Totales del turno. El backend no expone con qué medio se pagó cada venta: este desglose es del turno completo."
          />
        </div>

        {summary.salesByPaymentMethod.length === 0 ? (
          <EmptyState title="No hubo cobros en este turno" />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Medio de pago</TH>
                <TH align="right">Operaciones</TH>
                <TH align="right">Total</TH>
              </TR>
            </THead>
            <TBody>
              {summary.salesByPaymentMethod.map((metodo) => (
                <TR key={metodo.name}>
                  <TD>
                    <span className="flex items-center gap-2">
                      {metodo.name}
                      {metodo.affectsCash && <Badge tone="brand">Efectivo</Badge>}
                    </span>
                  </TD>
                  <TD align="right" numeric>
                    {formatNumber(metodo.count)}
                  </TD>
                  <TD align="right" numeric className="font-medium text-stone-900">
                    {formatMoney(metodo.total)}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      {/* Movimientos */}
      <Card flush>
        <div className="p-6 sm:p-8">
          <CardHeader
            title="Movimientos de caja"
            description="Todo lo que entró y salió del turno, incluidas las ventas en efectivo."
          />
        </div>

        {movements.length === 0 ? (
          <EmptyState title="No hubo movimientos en este turno" />
        ) : (
          <CashMovementsTable movements={movements} />
        )}
      </Card>

      {/* Ventas del turno, con su hora */}
      <Card flush>
        <div className="p-6 sm:p-8">
          <CardHeader
            title="Ventas del turno"
            description="En orden cronológico. Tocá una venta para verla o reimprimir su comprobante."
          />
        </div>

        {sales.length === 0 ? (
          <EmptyState title="No hubo ventas en este turno" />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Hora</TH>
                <TH>Comprobante</TH>
                <TH>Cliente</TH>
                <TH align="right">Total</TH>
              </TR>
            </THead>
            <TBody>
              {sales.map((venta) => {
                const anulada = venta.status === "VOIDED";
                const vuelto = toNumber(venta.changeGiven);

                return (
                  <TR key={venta.id} interactive onClick={() => navigate(`/ventas/${venta.id}`)}>
                    <TD className="text-stone-500">{formatDateTime(venta.createdAt)}</TD>
                    <TD className="font-mono text-xs text-stone-600">
                      {venta.number}
                      {anulada && (
                        <Badge tone="danger" className="ml-2">
                          Anulada
                        </Badge>
                      )}
                    </TD>
                    <TD className="text-stone-600">
                      {venta.customer?.name ?? <span className="text-stone-400">Sin cliente</span>}
                    </TD>
                    <TD
                      align="right"
                      numeric
                      className={anulada ? "text-stone-400 line-through" : "font-medium text-stone-900"}
                    >
                      {formatMoney(venta.total)}
                      {vuelto > 0 && (
                        <span className="block text-xs text-stone-400">
                          vuelto {formatMoney(vuelto)}
                        </span>
                      )}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
