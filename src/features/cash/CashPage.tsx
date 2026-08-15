import { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
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
import { Link } from "react-router-dom";
import { Can, PERMISSIONS, useAuth } from "@/features/auth";
import { getApiErrorMessage } from "@/lib/api";
import { formatDateTime, formatMoney, formatNumber, toNumber } from "@/lib/format";
import { useDocumentTitle } from "@/lib/hooks";
import { useCurrentSession, useRegisters } from "./api";
import { CashMovementsCard } from "./CashMovementsCard";
import { CloseRegisterDialog } from "./CloseRegisterDialog";
import { OpenRegisterScreen } from "./OpenRegisterScreen";
import type { ClosedSession } from "./types";

export function CashPage() {
  useDocumentTitle("Caja");

  const { can } = useAuth();
  // Leer cajas requiere sales.create o cash.open; abrirlas, cash.open.
  const puedeLeer = can(PERMISSIONS.SALES_CREATE) || can(PERMISSIONS.CASH_OPEN);

  const registers = useRegisters(puedeLeer);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [cerrando, setCerrando] = useState(false);
  /** Resumen del último cierre, para mostrarlo cuando ya no hay sesión. */
  const [ultimoCierre, setUltimoCierre] = useState<ClosedSession | null>(null);

  // Al cargar, seleccionar la primera caja abierta (o la primera que haya)
  useEffect(() => {
    if (selectedId !== null || registers.data === undefined) return;
    const abierta = registers.data.find((caja) => caja.openSession !== null);
    setSelectedId(abierta?.id ?? registers.data[0]?.id ?? null);
  }, [registers.data, selectedId]);

  const seleccionada = registers.data?.find((caja) => caja.id === selectedId) ?? null;
  const current = useCurrentSession(seleccionada?.openSession != null ? seleccionada.id : null);

  if (!puedeLeer) {
    return (
      <div className="space-y-8">
        <PageHeader title="Caja" description="Estado del turno." />
        <Alert tone="warning" title="No tenés acceso al estado de la caja">
          Consultar cajas requiere <code className="font-mono">sales.create</code> o{" "}
          <code className="font-mono">cash.open</code>.
        </Alert>
      </div>
    );
  }

  if (registers.isPending) return <LoadingBlock label="Cargando cajas…" />;

  if (registers.error !== null) {
    return (
      <div className="space-y-8">
        <PageHeader title="Caja" />
        <Alert tone="danger" title="No se pudieron cargar las cajas">
          {getApiErrorMessage(registers.error)}
        </Alert>
      </div>
    );
  }

  const cajas = registers.data ?? [];
  const resumen = current.data?.summary ?? null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Caja"
        description="Estado del turno y apertura."
        actions={
          <Can anyOf={[PERMISSIONS.CASH_CLOSE, PERMISSIONS.REPORTS_VIEW]}>
            <Link
              to="/caja/historial"
              className="text-sm font-medium text-stone-500 hover:text-stone-800"
            >
              Historial de cajas
            </Link>
          </Can>
        }
      />

      {cajas.length > 1 && (
        <Card flush>
          <Table>
            <THead>
              <TR>
                <TH>Caja</TH>
                <TH>Sucursal</TH>
                <TH>Estado</TH>
                <TH align="right">Abierta desde</TH>
              </TR>
            </THead>
            <TBody>
              {cajas.map((caja) => (
                <TR
                  key={caja.id}
                  interactive
                  onClick={() => setSelectedId(caja.id)}
                  className={caja.id === selectedId ? "bg-brand-50/60" : undefined}
                >
                  <TD className="font-medium text-stone-900">{caja.name}</TD>
                  <TD className="text-stone-500">{caja.branch.name}</TD>
                  <TD>
                    {caja.openSession !== null ? (
                      <Badge tone="success">Abierta</Badge>
                    ) : (
                      <Badge>Cerrada</Badge>
                    )}
                  </TD>
                  <TD align="right" numeric className="text-stone-500">
                    {caja.openSession !== null ? formatDateTime(caja.openSession.openedAt) : "—"}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      )}

      {/* Resumen del cierre recién hecho: la sesión ya no existe */}
      {ultimoCierre !== null && (
        <Card className="space-y-5 border-emerald-200 bg-emerald-50/40">
          <CardHeader
            title="Caja cerrada"
            description={`${ultimoCierre.cashRegister.name} · ${formatDateTime(ultimoCierre.closedAt)}`}
          />
          <dl className="grid gap-6 sm:grid-cols-3">
            <div className="space-y-1">
              <dt className="text-sm text-stone-500">Esperado</dt>
              <dd className="tabular text-xl font-semibold">
                {formatMoney(ultimoCierre.expectedAmount)}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm text-stone-500">Contado</dt>
              <dd className="tabular text-xl font-semibold">
                {formatMoney(ultimoCierre.countedAmount)}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm text-stone-500">Diferencia</dt>
              <dd
                className={
                  toNumber(ultimoCierre.difference) === 0
                    ? "tabular text-xl font-semibold text-emerald-700"
                    : "tabular text-xl font-semibold text-amber-700"
                }
              >
                {formatMoney(ultimoCierre.difference)}
              </dd>
            </div>
          </dl>
          <Button variant="secondary" size="sm" onClick={() => setUltimoCierre(null)}>
            Entendido
          </Button>
        </Card>
      )}

      {seleccionada === null ? (
        <EmptyState title="No hay cajas configuradas" />
      ) : seleccionada.openSession === null ? (
        <OpenRegisterScreen onOpened={(registerId) => setSelectedId(registerId)} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Saldo inicial" value={formatMoney(resumen?.openingAmount ?? 0)} />
            <StatCard label="Ingresos" value={formatMoney(resumen?.cashIn ?? 0)} tone="brand" />
            <StatCard label="Egresos" value={formatMoney(resumen?.cashOut ?? 0)} tone="warning" />
            <StatCard
              label="Efectivo esperado"
              value={formatMoney(resumen?.expectedCash ?? 0)}
              hint={`${formatNumber(resumen?.movementsCount ?? 0)} movimientos`}
            />
          </div>

          <Card flush>
            <div className="p-6 sm:p-8">
              <CardHeader
                title={`Turno en ${seleccionada.name}`}
                description={
                  current.data
                    ? `Abierta por ${current.data.session.openedBy.fullName} · ${formatDateTime(
                        current.data.session.openedAt
                      )}`
                    : undefined
                }
                action={
                  <div className="flex items-center gap-3">
                    <Badge tone="success">Abierta</Badge>
                    <Can permission={PERMISSIONS.CASH_CLOSE}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setCerrando(true)}
                        disabled={current.data === null || current.data === undefined}
                      >
                        Cerrar caja
                      </Button>
                    </Can>
                  </div>
                }
              />
            </div>

            {current.isPending ? (
              <LoadingBlock label="Cargando el turno…" />
            ) : resumen && resumen.salesByPaymentMethod.length > 0 ? (
              <>
                <Table>
                  <THead>
                    <TR>
                      <TH>Medio de pago</TH>
                      <TH align="right">Operaciones</TH>
                      <TH align="right">Total</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {resumen.salesByPaymentMethod.map((metodo) => (
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

                {resumen.changeGiven > 0 && (
                  <p className="border-t border-stone-100 px-6 py-4 text-sm text-stone-500 sm:px-8">
                    El efectivo de la tabla es lo que entregaron los clientes. Se devolvieron{" "}
                    <span className="tabular font-medium text-stone-700">
                      {formatMoney(resumen.changeGiven)}
                    </span>{" "}
                    de vuelto, ya descontados del efectivo esperado.
                  </p>
                )}
              </>
            ) : (
              <EmptyState
                title="Todavía no hubo cobros en este turno"
                description="Las ventas que se cobren van a aparecer acá."
              />
            )}
          </Card>

          {current.data !== null && current.data !== undefined && (
            <CashMovementsCard sessionId={current.data.session.id} />
          )}
        </div>
      )}

      {current.data !== null && current.data !== undefined && (
        <CloseRegisterDialog
          open={cerrando}
          sessionId={current.data.session.id}
          registerName={current.data.session.cashRegister.name}
          expectedCash={current.data.summary.expectedCash}
          onClose={() => setCerrando(false)}
          onClosed={(sesion) => {
            setCerrando(false);
            setUltimoCierre(sesion);
          }}
        />
      )}
    </div>
  );
}
