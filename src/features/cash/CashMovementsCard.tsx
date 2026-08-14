import { useState, type FormEvent } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Input,
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api";
import { formatDateTime, formatMoney, toNumber } from "@/lib/format";
import { useAddMovement } from "./api";
import type { CashMovement, ManualMovementType } from "./types";

const TIPOS: Array<{ value: ManualMovementType; label: string; ayuda: string }> = [
  { value: "EXPENSE", label: "Gasto", ayuda: "Plata que sale para pagar algo" },
  { value: "WITHDRAWAL", label: "Retiro", ayuda: "Plata que se saca de la caja" },
  { value: "DEPOSIT", label: "Depósito", ayuda: "Plata que entra a la caja" },
];

const ETIQUETA: Record<string, string> = {
  EXPENSE: "Gasto",
  WITHDRAWAL: "Retiro",
  DEPOSIT: "Depósito",
  SALE_CASH: "Venta en efectivo",
  REFUND: "Devolución",
  ADJUSTMENT: "Ajuste",
};

/**
 * Movimientos manuales del turno.
 *
 * OJO: el backend no expone un endpoint que liste los movimientos de una
 * sesión — `/sessions/current` solo devuelve `movementsCount`. Así que la
 * tabla muestra los registrados DESDE ESTA PANTALLA, y al lado se aclara
 * cuántos lleva el turno según el servidor.
 */
export function CashMovementsCard({
  sessionId,
  movementsCount,
}: {
  sessionId: number;
  /** Total del turno según el backend, incluidas las ventas en efectivo. */
  movementsCount: number;
}) {
  const addMovement = useAddMovement(sessionId);

  const [type, setType] = useState<ManualMovementType>("EXPENSE");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [registrados, setRegistrados] = useState<CashMovement[]>([]);

  const monto = Number(amount.replace(",", "."));
  const montoValido = Number.isFinite(monto) && monto > 0;
  const descripcionValida = description.trim().length > 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!montoValido || !descripcionValida) return;

    addMovement.mutate(
      { type, amount: monto, description: description.trim() },
      {
        onSuccess: (movimiento) => {
          setRegistrados((previos) => [movimiento, ...previos]);
          setAmount("");
          setDescription("");
        },
      }
    );
  };

  return (
    <Card flush>
      <div className="space-y-6 p-6 sm:p-8">
        <CardHeader
          title="Movimientos de caja"
          description="Gastos, retiros y depósitos del turno."
        />

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-3">
            <Select
              label="Tipo"
              value={type}
              onChange={(event) => setType(event.target.value as ManualMovementType)}
              hint={TIPOS.find((t) => t.value === type)?.ayuda}
            >
              {TIPOS.map((tipo) => (
                <option key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </option>
              ))}
            </Select>

            <Input
              label="Monto"
              inputMode="decimal"
              placeholder="0,00"
              required
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              error={amount !== "" && !montoValido ? "Ingresá un monto mayor a cero" : undefined}
            />

            <Input
              label="Descripción"
              required
              placeholder="Ej: flete de plantines"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              hint="Obligatoria: queda en la auditoría."
            />
          </div>

          {addMovement.error !== null && (
            <Alert tone="danger" title="No se pudo registrar el movimiento">
              {getApiErrorMessage(addMovement.error)}
            </Alert>
          )}

          <Button
            type="submit"
            loading={addMovement.isPending}
            disabled={!montoValido || !descripcionValida}
          >
            Registrar movimiento
          </Button>
        </form>
      </div>

      {registrados.length === 0 ? (
        <EmptyState
          title="Sin movimientos registrados desde acá"
          description={
            movementsCount > 0
              ? `El turno lleva ${movementsCount} movimientos en total, contando las ventas en efectivo.`
              : "Los gastos, retiros y depósitos que cargues van a aparecer acá."
          }
        />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Hora</TH>
                <TH>Tipo</TH>
                <TH>Descripción</TH>
                <TH align="right">Monto</TH>
              </TR>
            </THead>
            <TBody>
              {registrados.map((movimiento) => {
                const importe = toNumber(movimiento.amount);
                return (
                  <TR key={movimiento.id}>
                    <TD className="text-stone-500">{formatDateTime(movimiento.createdAt)}</TD>
                    <TD>
                      <Badge tone={importe >= 0 ? "success" : "warning"}>
                        {ETIQUETA[movimiento.type] ?? movimiento.type}
                      </Badge>
                    </TD>
                    <TD>{movimiento.description ?? "—"}</TD>
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

          <p className="px-6 py-4 text-xs text-stone-400 sm:px-8">
            Se listan los {registrados.length} movimientos cargados desde esta pantalla. El turno
            lleva {movementsCount} en total (incluye las ventas en efectivo): el backend todavía no
            expone el detalle completo.
          </p>
        </>
      )}
    </Card>
  );
}
