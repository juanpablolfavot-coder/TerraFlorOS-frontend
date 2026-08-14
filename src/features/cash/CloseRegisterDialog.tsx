import { useState } from "react";
import { Alert, Button, Input, Modal } from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useCloseSession } from "./api";
import type { ClosedSession } from "./types";

/**
 * Arqueo y cierre del turno.
 *
 * Dos pasos a propósito: primero se declara el efectivo contado y se ve
 * la diferencia, y recién después se confirma. Cerrar es irreversible —
 * la sesión cerrada es inmutable y el backend rechaza un segundo cierre.
 */
export function CloseRegisterDialog({
  open,
  sessionId,
  registerName,
  expectedCash,
  onClose,
  onClosed,
}: {
  open: boolean;
  sessionId: number;
  registerName: string;
  /** Efectivo esperado según el resumen en vivo del backend. */
  expectedCash: number;
  onClose: () => void;
  onClosed: (session: ClosedSession) => void;
}) {
  const closeSession = useCloseSession(sessionId);

  const [counted, setCounted] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmando, setConfirmando] = useState(false);

  const contado = Number(counted.replace(",", "."));
  const contadoValido = counted.trim() !== "" && Number.isFinite(contado) && contado >= 0;

  // Mismo cálculo que hace el backend: contado − esperado
  const diferencia = contadoValido ? Math.round((contado - expectedCash) * 100) / 100 : 0;
  const cuadra = diferencia === 0;

  const cerrar = () => {
    closeSession.mutate(
      { countedAmount: contado, ...(notes.trim() !== "" ? { notes: notes.trim() } : {}) },
      {
        onSuccess: (sesion) => {
          setCounted("");
          setNotes("");
          setConfirmando(false);
          onClosed(sesion);
        },
        onError: () => setConfirmando(false),
      }
    );
  };

  const cancelar = () => {
    if (closeSession.isPending) return;
    setConfirmando(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={cancelar}
      title={confirmando ? "¿Cerrar la caja?" : `Cerrar ${registerName}`}
      description={
        confirmando
          ? "El cierre es irreversible: una vez cerrada, la sesión no se puede modificar."
          : "Contá el efectivo del cajón y declaralo para hacer el arqueo."
      }
      footer={
        confirmando ? (
          <>
            <Button
              variant="secondary"
              onClick={() => setConfirmando(false)}
              disabled={closeSession.isPending}
            >
              Volver
            </Button>
            <Button variant="danger" onClick={cerrar} loading={closeSession.isPending} autoFocus>
              Sí, cerrar la caja
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={cancelar}>
              Cancelar
            </Button>
            <Button onClick={() => setConfirmando(true)} disabled={!contadoValido}>
              Continuar
            </Button>
          </>
        )
      }
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between rounded-lg bg-stone-50 px-4 py-3">
          <span className="text-sm text-stone-600">Efectivo esperado</span>
          <span className="tabular font-semibold text-stone-900">{formatMoney(expectedCash)}</span>
        </div>

        {!confirmando && (
          <>
            <Input
              label="Efectivo contado"
              inputMode="decimal"
              placeholder="0,00"
              autoFocus
              required
              value={counted}
              onChange={(event) => setCounted(event.target.value)}
              error={
                counted !== "" && !contadoValido ? "Ingresá un monto válido" : undefined
              }
              hint="Lo que hay realmente en el cajón."
            />

            <Input
              label="Notas (opcional)"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Ej: faltante por vuelto mal dado"
            />
          </>
        )}

        {contadoValido && (
          <div
            className={cn(
              "flex items-center justify-between rounded-lg px-4 py-3",
              cuadra ? "bg-emerald-50" : diferencia > 0 ? "bg-sky-50" : "bg-amber-50"
            )}
          >
            <span className="text-sm font-medium text-stone-700">
              {cuadra ? "La caja cuadra" : diferencia > 0 ? "Sobrante" : "Faltante"}
            </span>
            <span
              className={cn(
                "tabular text-lg font-semibold",
                cuadra ? "text-emerald-700" : diferencia > 0 ? "text-sky-700" : "text-amber-700"
              )}
            >
              {cuadra ? formatMoney(0) : formatMoney(Math.abs(diferencia))}
            </span>
          </div>
        )}

        {confirmando && (
          <p className="tabular text-sm text-stone-600">
            Contado {formatMoney(contado)} sobre {formatMoney(expectedCash)} esperados.
          </p>
        )}

        {closeSession.error !== null && (
          <Alert tone="danger" title="No se pudo cerrar la caja">
            {getApiErrorMessage(closeSession.error)}
          </Alert>
        )}
      </div>
    </Modal>
  );
}
