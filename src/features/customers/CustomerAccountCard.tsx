import { useState } from "react";
import {
  Alert,
  Badge,
  Card,
  CardHeader,
  EmptyState,
  LoadingBlock,
  Pagination,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api";
import { formatDateTime, formatMoney, toNumber } from "@/lib/format";
import { useCustomerAccount } from "./api";

/**
 * Cuenta corriente del cliente: saldo y movimientos.
 *
 * SOLO LECTURA a propósito. El backend expone la lectura, pero todavía no
 * crea asientos: no hay venta a crédito ni registro de pagos. Por eso acá
 * no hay ningún botón de acción — inventarlo prometería algo que el
 * sistema no puede hacer.
 */
export function CustomerAccountCard({
  customerId,
  creditLimit,
}: {
  customerId: number;
  creditLimit: number | null;
}) {
  const [page, setPage] = useState(1);
  const cuenta = useCustomerAccount(customerId, page);

  const saldo = cuenta.data?.balance ?? 0;
  const debe = saldo > 0;
  const aFavor = saldo < 0;

  return (
    <Card flush>
      <div className="space-y-6 p-6 sm:p-8">
        <CardHeader
          title="Cuenta corriente"
          description="Por ahora es solo lectura: todavía no se puede vender a crédito ni registrar pagos desde el sistema."
        />

        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="space-y-1">
            <p className="text-sm font-medium text-stone-500">
              {aFavor ? "Saldo a favor" : "Saldo"}
            </p>
            <p
              className={
                "tabular text-3xl font-semibold tracking-tight " +
                (debe ? "text-amber-700" : aFavor ? "text-emerald-700" : "text-stone-900")
              }
            >
              {formatMoney(Math.abs(saldo))}
            </p>
            <p className="text-sm text-stone-500">
              {debe ? "Lo que el cliente adeuda." : aFavor ? "A favor del cliente." : "Sin deuda."}
            </p>
          </div>

          <div className="space-y-1 text-right">
            <p className="text-sm text-stone-500">Límite de crédito</p>
            <p className="tabular text-stone-800">
              {creditLimit === null ? "Sin límite configurado" : formatMoney(creditLimit)}
            </p>
            {creditLimit !== null && debe && saldo > creditLimit && (
              <Badge tone="warning">Supera el límite</Badge>
            )}
          </div>
        </div>
      </div>

      {cuenta.isPending ? (
        <LoadingBlock label="Cargando movimientos…" />
      ) : cuenta.error !== null ? (
        <Alert tone="danger" className="mx-6 mb-6" title="No se pudo cargar la cuenta corriente">
          {getApiErrorMessage(cuenta.error)}
        </Alert>
      ) : (cuenta.data?.items.length ?? 0) === 0 ? (
        <EmptyState
          title="Sin movimientos en cuenta corriente"
          description="Cuando exista la venta a crédito, los débitos y los pagos van a aparecer acá."
        />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Fecha</TH>
                <TH>Detalle</TH>
                <TH>Vencimiento</TH>
                <TH align="right">Importe</TH>
              </TR>
            </THead>
            <TBody>
              {(cuenta.data?.items ?? []).map((asiento) => {
                const importe = toNumber(asiento.amount);

                return (
                  <TR key={asiento.id}>
                    <TD className="text-stone-500">{formatDateTime(asiento.createdAt)}</TD>
                    <TD>
                      {asiento.description ?? (importe >= 0 ? "Débito" : "Pago")}
                      {asiento.refType !== null && (
                        <span className="block text-xs text-stone-400">
                          {asiento.refType}
                          {asiento.refId !== null ? ` #${asiento.refId}` : ""}
                        </span>
                      )}
                    </TD>
                    <TD className="text-stone-500">
                      {asiento.dueDate === null ? "—" : formatDateTime(asiento.dueDate)}
                    </TD>
                    <TD
                      align="right"
                      numeric
                      className={importe >= 0 ? "text-amber-700" : "text-emerald-700"}
                    >
                      {importe >= 0 ? "+" : "−"} {formatMoney(Math.abs(importe))}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>

          {cuenta.data !== undefined && (
            <Pagination
              page={cuenta.data.page}
              pageSize={cuenta.data.pageSize}
              total={cuenta.data.total}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </Card>
  );
}
