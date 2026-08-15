import { Badge, Table, TBody, TD, TH, THead, TR } from "@/components/ui";
import { formatDateTime, formatMoney, toNumber } from "@/lib/format";
import type { CashMovementType, SessionMovement } from "./types";

const ETIQUETA: Record<CashMovementType, string> = {
  EXPENSE: "Gasto",
  WITHDRAWAL: "Retiro",
  DEPOSIT: "Depósito",
  SALE_CASH: "Venta en efectivo",
  REFUND: "Devolución",
  ADJUSTMENT: "Ajuste",
};

/** Los automáticos se distinguen de los que carga una persona. */
const AUTOMATICOS: CashMovementType[] = ["SALE_CASH", "REFUND"];

/**
 * Tabla de movimientos del turno. Solo presentación: la usan tanto la
 * caja en curso como el detalle de un turno del historial.
 */
export function CashMovementsTable({ movements }: { movements: SessionMovement[] }) {
  return (
    <Table>
      <THead>
        <TR>
          <TH>Hora</TH>
          <TH>Tipo</TH>
          <TH>Descripción</TH>
          <TH>Usuario</TH>
          <TH align="right">Monto</TH>
        </TR>
      </THead>
      <TBody>
        {movements.map((movimiento) => {
          const importe = toNumber(movimiento.amount);
          const automatico = AUTOMATICOS.includes(movimiento.type);

          return (
            <TR key={movimiento.id}>
              <TD className="text-stone-500">{formatDateTime(movimiento.createdAt)}</TD>

              <TD>
                <Badge tone={automatico ? "info" : importe >= 0 ? "success" : "warning"}>
                  {ETIQUETA[movimiento.type] ?? movimiento.type}
                </Badge>
              </TD>

              <TD>{movimiento.description ?? "—"}</TD>

              <TD className="text-stone-500">
                {movimiento.user?.fullName ?? `Usuario #${movimiento.userId}`}
              </TD>

              <TD
                align="right"
                numeric
                className={importe >= 0 ? "text-emerald-700" : "text-amber-700"}
              >
                {importe >= 0 ? "+" : "−"} {formatMoney(Math.abs(importe))}
              </TD>
            </TR>
          );
        })}
      </TBody>
    </Table>
  );
}
