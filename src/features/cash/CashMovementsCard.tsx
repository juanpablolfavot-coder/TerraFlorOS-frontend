import { useState, type FormEvent } from "react";
import {
  Alert,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Input,
  LoadingBlock,
  Select,
} from "@/components/ui";
import { Can, PERMISSIONS } from "@/features/auth";
import { getApiErrorMessage } from "@/lib/api";
import { useAddMovement, useSessionMovements } from "./api";
import { CashMovementsTable } from "./CashMovementsTable";
import type { ManualMovementType } from "./types";

const TIPOS: Array<{ value: ManualMovementType; label: string; ayuda: string }> = [
  { value: "EXPENSE", label: "Gasto", ayuda: "Plata que sale para pagar algo" },
  { value: "WITHDRAWAL", label: "Retiro", ayuda: "Plata que se saca de la caja" },
  { value: "DEPOSIT", label: "Depósito", ayuda: "Plata que entra a la caja" },
];

/**
 * Movimientos del turno.
 *
 * La lista sale de `GET /sessions/:id/movements`, así que está completa:
 * incluye las ventas en efectivo y los movimientos que haya cargado otro
 * cajero, no solo lo que se hizo desde esta pantalla.
 */
export function CashMovementsCard({ sessionId }: { sessionId: number }) {
  const movimientos = useSessionMovements(sessionId);
  const addMovement = useAddMovement(sessionId);

  const [type, setType] = useState<ManualMovementType>("EXPENSE");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const monto = Number(amount.replace(",", "."));
  const montoValido = Number.isFinite(monto) && monto > 0;
  const descripcionValida = description.trim().length > 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!montoValido || !descripcionValida) return;

    addMovement.mutate(
      { type, amount: monto, description: description.trim() },
      {
        // La mutación invalida la caché de caja, así que la tabla se
        // vuelve a pedir sola con el movimiento nuevo incluido.
        onSuccess: () => {
          setAmount("");
          setDescription("");
        },
      }
    );
  };

  const lista = movimientos.data ?? [];

  return (
    <Card flush>
      <div className="space-y-6 p-6 sm:p-8">
        <CardHeader
          title="Movimientos de caja"
          description="Todo lo que entró y salió del turno, incluidas las ventas en efectivo."
        />

        <Can permission={PERMISSIONS.CASH_MOVEMENT}>
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
        </Can>
      </div>

      {movimientos.isPending ? (
        <LoadingBlock label="Cargando movimientos…" />
      ) : movimientos.error !== null ? (
        <Alert tone="danger" className="mx-6 mb-6" title="No se pudieron cargar los movimientos">
          {getApiErrorMessage(movimientos.error)}
        </Alert>
      ) : lista.length === 0 ? (
        <EmptyState
          title="Todavía no hubo movimientos"
          description="Las ventas en efectivo y los gastos del turno van a aparecer acá."
        />
      ) : (
        <CashMovementsTable movements={lista} />
      )}
    </Card>
  );
}
