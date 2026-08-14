import { Alert, Badge, Button, Select } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { PaymentLine, PaymentMethod } from "./types";

// Sin `w-full`: el ancho lo fija quien lo usa. Si estuviera acá chocaría
// con el `w-28` del uso (dos utilidades de width) y el input se comería
// el espacio del selector de método.
const AMOUNT_INPUT =
  "rounded-lg bg-white px-3 py-2 text-right text-sm tabular ring-1 ring-stone-300 " +
  "ring-inset focus:ring-2 focus:ring-brand-600 focus:outline-none";

/**
 * Panel de cobro con soporte de pago mixto: varias filas método + monto.
 * El backend exige que la suma cierre EXACTA contra el total, así que el
 * botón de cobrar solo se habilita cuando la diferencia es cero.
 */
export function PaymentPanel({
  total,
  payments,
  methods,
  methodsError,
  onChange,
  onAdd,
  onRemove,
  onCompletar,
}: {
  total: number;
  payments: PaymentLine[];
  methods: PaymentMethod[];
  /** Mensaje si no se pudo cargar el catálogo de métodos. */
  methodsError: string | null;
  onChange: (key: string, patch: Partial<PaymentLine>) => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
  /** Completa el pago pendiente en la última fila. */
  onCompletar: () => void;
}) {
  const pagado = Math.round(payments.reduce((suma, p) => suma + p.amount, 0) * 100) / 100;
  const restante = Math.round((total - pagado) * 100) / 100;

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        {payments.map((pago) => (
          <div key={pago.key} className="flex items-center gap-2">
            <Select
              aria-label="Método de pago"
              className="flex-1"
              value={pago.paymentMethodId ?? ""}
              disabled={methods.length === 0}
              onChange={(event) =>
                onChange(pago.key, {
                  paymentMethodId: event.target.value === "" ? null : Number(event.target.value),
                })
              }
            >
              <option value="">Método…</option>
              {methods.map((metodo) => (
                <option key={metodo.id} value={metodo.id}>
                  {metodo.name}
                </option>
              ))}
            </Select>

            <input
              type="number"
              min={0}
              step="any"
              className={cn(AMOUNT_INPUT, "w-28")}
              aria-label="Monto"
              value={pago.amount === 0 ? "" : pago.amount}
              placeholder="0,00"
              onChange={(event) => {
                const valor = Number(event.target.value);
                onChange(pago.key, { amount: Number.isFinite(valor) && valor >= 0 ? valor : 0 });
              }}
            />

            <button
              type="button"
              onClick={() => onRemove(pago.key)}
              disabled={payments.length === 1}
              aria-label="Quitar pago"
              className="rounded-md p-2 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-30"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinecap="round"
                className="size-4"
                aria-hidden="true"
              >
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={onAdd} disabled={methods.length === 0}>
          Agregar pago
        </Button>
        {restante > 0 && (
          <Button variant="ghost" size="sm" onClick={onCompletar} disabled={methods.length === 0}>
            Completar {formatMoney(restante)}
          </Button>
        )}
      </div>

      {methodsError !== null && (
        <Alert tone="danger" title="No se pueden cargar los métodos de pago">
          {methodsError}
        </Alert>
      )}

      {/* Estado del pago: cuánto falta o cuánto sobra */}
      <div className="space-y-2 border-t border-stone-200 pt-5 text-sm">
        <div className="flex items-center justify-between text-stone-500">
          <span>Pagado</span>
          <span className="tabular">{formatMoney(pagado)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-stone-500">{restante >= 0 ? "Falta" : "Sobra"}</span>
          <span
            className={cn(
              "tabular font-semibold",
              restante === 0 ? "text-brand-700" : restante > 0 ? "text-amber-600" : "text-red-600"
            )}
          >
            {formatMoney(Math.abs(restante))}
          </span>
        </div>
      </div>

      {restante < 0 && (
        <Alert tone="warning" className="text-sm">
          El backend exige que los pagos sumen exactamente el total: no acepta vuelto.
        </Alert>
      )}

      {payments.some((p) => p.amount > 0 && p.paymentMethodId === null) && (
        <p className="text-sm text-amber-600">Elegí el método de cada pago cargado.</p>
      )}

      {methods.length > 0 && (
        <p className="text-xs text-stone-400">
          {methods.filter((m) => m.affectsCash).length > 0 ? (
            <>
              Los cobros en{" "}
              <Badge tone="brand">
                {methods.find((m) => m.affectsCash)?.name ?? "efectivo"}
              </Badge>{" "}
              impactan en el turno de caja.
            </>
          ) : null}
        </p>
      )}
    </div>
  );
}
