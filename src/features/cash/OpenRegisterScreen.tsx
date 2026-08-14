import { useState, type FormEvent } from "react";
import { Alert, Badge, Button, Card, CardHeader, Input, LoadingBlock } from "@/components/ui";
import { PERMISSIONS, useAuth } from "@/features/auth";
import { getApiErrorMessage } from "@/lib/api";
import { formatDateTime, formatMoney } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useOpenSession, useRegisters } from "./api";

/**
 * Apertura de caja. Se usa sola en /caja y embebida como primer paso del
 * POS: sin sesión abierta no se puede vender, y el backend lo rechaza con
 * 409, así que acá no se intenta saltear nada.
 */
export function OpenRegisterScreen({ onOpened }: { onOpened?: (registerId: number) => void }) {
  const { can } = useAuth();
  const puedeAbrir = can(PERMISSIONS.CASH_OPEN);

  const registers = useRegisters(puedeAbrir);
  const openSession = useOpenSession();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [openingAmount, setOpeningAmount] = useState("0");

  // Las cajas se pueden leer con sales.create, pero abrirlas exige
  // cash.open: al vendedor le queda avisarle a un encargado.
  if (!puedeAbrir) {
    return (
      <Card className="space-y-4">
        <CardHeader
          title="No hay una caja abierta"
          description="Para vender hace falta una sesión de caja abierta."
        />
        <Alert tone="warning" title="Pedí a un encargado que abra la caja">
          Tu usuario no tiene el permiso <code className="font-mono">cash.open</code>, así que no
          podés abrirla vos.
        </Alert>
      </Card>
    );
  }

  if (registers.isPending) return <LoadingBlock label="Buscando cajas…" />;

  if (registers.error !== null) {
    return (
      <Alert tone="danger" title="No se pudieron cargar las cajas">
        {getApiErrorMessage(registers.error)}
      </Alert>
    );
  }

  const cajas = registers.data ?? [];
  const seleccionada = cajas.find((caja) => caja.id === selectedId) ?? null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (seleccionada === null) return;

    const monto = Number(openingAmount.replace(",", "."));
    if (!Number.isFinite(monto) || monto < 0) return;

    openSession.mutate(
      { registerId: seleccionada.id, openingAmount: monto },
      { onSuccess: () => onOpened?.(seleccionada.id) }
    );
  };

  const montoValido = (() => {
    const monto = Number(openingAmount.replace(",", "."));
    return Number.isFinite(monto) && monto >= 0;
  })();

  return (
    <Card className="space-y-8">
      <CardHeader
        title="Abrir caja"
        description="Elegí la caja y declará con cuánto efectivo arranca el turno."
      />

      {cajas.length === 0 ? (
        <Alert tone="warning" title="No hay cajas configuradas">
          Tu sucursal no tiene ninguna caja activa. Pedile a un administrador que cree una.
        </Alert>
      ) : (
        <form className="space-y-8" onSubmit={handleSubmit}>
          <fieldset className="space-y-3">
            <legend className="mb-3 text-sm font-medium text-stone-700">Caja</legend>

            <div className="grid gap-3 sm:grid-cols-2">
              {cajas.map((caja) => {
                const ocupada = caja.openSession !== null;
                const elegida = caja.id === selectedId;

                return (
                  <label
                    key={caja.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors",
                      ocupada && "cursor-not-allowed opacity-60",
                      elegida ? "border-brand-500 bg-brand-50" : "border-stone-200 hover:bg-stone-50"
                    )}
                  >
                    <input
                      type="radio"
                      name="caja"
                      className="mt-1 accent-brand-600"
                      value={caja.id}
                      checked={elegida}
                      disabled={ocupada}
                      onChange={() => setSelectedId(caja.id)}
                    />
                    <span className="space-y-1">
                      <span className="flex items-center gap-2">
                        <span className="font-medium text-stone-900">{caja.name}</span>
                        {ocupada && <Badge tone="warning">Ya abierta</Badge>}
                      </span>
                      <span className="block text-sm text-stone-500">{caja.branch.name}</span>
                      {caja.openSession !== null && (
                        <span className="block text-xs text-stone-400">
                          Abierta por {caja.openSession.openedBy.username} ·{" "}
                          {formatDateTime(caja.openSession.openedAt)} · saldo inicial{" "}
                          {formatMoney(caja.openSession.openingAmount)}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <Input
            label="Saldo inicial en efectivo"
            inputMode="decimal"
            required
            value={openingAmount}
            onChange={(event) => setOpeningAmount(event.target.value)}
            error={!montoValido ? "Ingresá un monto válido" : undefined}
            hint="Lo que hay en el cajón al arrancar el turno."
            className="max-w-xs"
          />

          {openSession.error !== null && (
            <Alert tone="danger" title="No se pudo abrir la caja">
              {getApiErrorMessage(openSession.error)}
            </Alert>
          )}

          <Button
            type="submit"
            size="lg"
            loading={openSession.isPending}
            disabled={seleccionada === null || !montoValido}
          >
            Abrir caja
          </Button>
        </form>
      )}
    </Card>
  );
}
