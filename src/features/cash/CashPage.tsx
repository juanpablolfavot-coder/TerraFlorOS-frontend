import { useEffect, useState } from "react";
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
import { PERMISSIONS, useAuth } from "@/features/auth";
import { getApiErrorMessage } from "@/lib/api";
import { formatDateTime, formatMoney, formatNumber } from "@/lib/format";
import { useDocumentTitle } from "@/lib/hooks";
import { useCurrentSession, useRegisters } from "./api";
import { OpenRegisterScreen } from "./OpenRegisterScreen";

export function CashPage() {
  useDocumentTitle("Caja");

  const { can } = useAuth();
  const puedeAbrir = can(PERMISSIONS.CASH_OPEN);

  const registers = useRegisters(puedeAbrir);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Al cargar, seleccionar la primera caja abierta (o la primera que haya)
  useEffect(() => {
    if (selectedId !== null || registers.data === undefined) return;
    const abierta = registers.data.find((caja) => caja.openSession !== null);
    setSelectedId(abierta?.id ?? registers.data[0]?.id ?? null);
  }, [registers.data, selectedId]);

  const seleccionada = registers.data?.find((caja) => caja.id === selectedId) ?? null;
  const current = useCurrentSession(seleccionada?.openSession != null ? seleccionada.id : null);

  if (!puedeAbrir) {
    return (
      <div className="space-y-8">
        <PageHeader title="Caja" description="Estado del turno." />
        <Alert tone="warning" title="No tenés acceso al estado de la caja">
          Consultar y abrir cajas requiere el permiso <code className="font-mono">cash.open</code>.
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
      <PageHeader title="Caja" description="Estado del turno y apertura." />

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
                action={<Badge tone="success">Abierta</Badge>}
              />
            </div>

            {current.isPending ? (
              <LoadingBlock label="Cargando el turno…" />
            ) : resumen && resumen.salesByPaymentMethod.length > 0 ? (
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
            ) : (
              <EmptyState
                title="Todavía no hubo cobros en este turno"
                description="Las ventas que se cobren van a aparecer acá."
              />
            )}
          </Card>

          <p className="text-sm text-stone-400">
            Los movimientos manuales y el cierre con arqueo todavía no están implementados en la
            interfaz.
          </p>
        </div>
      )}
    </div>
  );
}
