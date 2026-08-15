import { Alert, Badge, Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import { montoATexto, montoDe, sugerenciasDeEfectivo, type PaymentTotals } from "./paymentRules";
import type { PaymentLine, PaymentMethod } from "./types";

/**
 * El monto es lo que más se tipea del panel: va grande, alineado a la
 * derecha y con el signo adentro, como en una caja registradora.
 */
const AMOUNT_INPUT =
  "h-14 w-full rounded-lg bg-white pr-4 pl-9 text-right text-2xl tabular text-stone-900 " +
  "ring-1 ring-stone-300 ring-inset placeholder:text-stone-300 " +
  "focus:ring-2 focus:ring-brand-600 focus:outline-none";

/** Cartel de atajo de efectivo: etiqueta chica arriba, importe abajo. */
function AtajoDeMonto({
  etiqueta,
  monto,
  destacado = false,
  onClick,
}: {
  etiqueta: string;
  monto: number;
  destacado?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${etiqueta} ${formatMoney(monto)}`}
      className={cn(
        "rounded-lg px-2 py-2.5 text-center transition-colors",
        destacado
          ? "bg-brand-50 ring-1 ring-brand-200 ring-inset hover:bg-brand-100"
          : "bg-white ring-1 ring-stone-300 ring-inset hover:bg-stone-50"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "block text-[11px] font-medium tracking-wide uppercase",
          destacado ? "text-brand-700" : "text-stone-400"
        )}
      >
        {etiqueta}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          // 13px y no 14: con tres carteles en la columna del cobro, un
          // importe de cinco cifras rozaba el borde
          "tabular block text-[13px] font-semibold whitespace-nowrap",
          destacado ? "text-brand-800" : "text-stone-800"
        )}
      >
        {formatMoney(monto)}
      </span>
    </button>
  );
}

/**
 * Fila de pago: método, monto y atajos.
 *
 * El método se elige con cartelitos y no con un desplegable: en el
 * mostrador se cobra con un toque, sin abrir una lista y buscar la
 * opción. Cada fila tiene los suyos, así el pago mixto sigue funcionando
 * igual.
 */
function PaymentRow({
  pago,
  metodo,
  methods,
  falta,
  numero,
  sePuedeQuitar,
  onChange,
  onRemove,
}: {
  pago: PaymentLine;
  metodo: PaymentMethod | undefined;
  methods: PaymentMethod[];
  falta: number;
  numero: number;
  sePuedeQuitar: boolean;
  onChange: (key: string, patch: Partial<PaymentLine>) => void;
  onRemove: (key: string) => void;
}) {
  const esEfectivo = metodo?.affectsCash === true;
  const sugerencias = esEfectivo ? sugerenciasDeEfectivo(falta) : [];

  return (
    <div className="space-y-3 rounded-xl p-4 ring-1 ring-stone-200 ring-inset">
      {sePuedeQuitar && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">
            Pago {numero}
          </p>
          <button
            type="button"
            onClick={() => onRemove(pago.key)}
            aria-label={`Quitar el pago ${numero}`}
            className="rounded-md p-1.5 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600"
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
      )}

      <div role="group" aria-label="Método de pago" className="grid grid-cols-2 gap-2">
        {methods.map((opcion) => {
          const elegido = opcion.id === pago.paymentMethodId;

          return (
            <button
              key={opcion.id}
              type="button"
              aria-pressed={elegido}
              onClick={() => onChange(pago.key, { paymentMethodId: opcion.id })}
              className={cn(
                "flex min-h-11 items-center justify-center rounded-lg px-3 py-2",
                "text-sm leading-tight font-medium transition-colors",
                elegido
                  ? "bg-brand-600 text-white shadow-xs ring-1 ring-brand-600 ring-inset"
                  : "bg-white text-stone-700 ring-1 ring-stone-300 ring-inset hover:bg-stone-50"
              )}
            >
              {opcion.name}
            </button>
          );
        })}
      </div>

      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-lg text-stone-400"
        >
          $
        </span>
        <input
          type="text"
          inputMode="decimal"
          aria-label="Monto"
          className={AMOUNT_INPUT}
          placeholder="0,00"
          value={pago.amount}
          onChange={(event) => onChange(pago.key, { amount: event.target.value })}
        />
      </div>

      {sugerencias.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-stone-500">¿Con cuánto paga?</p>
          <div className="grid grid-cols-3 gap-2">
            <AtajoDeMonto
              etiqueta="Justo"
              monto={falta}
              destacado
              onClick={() => onChange(pago.key, { amount: montoATexto(falta) })}
            />
            {sugerencias.map((monto) => (
              <AtajoDeMonto
                key={monto}
                etiqueta="Paga con"
                monto={monto}
                onClick={() => onChange(pago.key, { amount: montoATexto(monto) })}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Panel de cobro con pago mixto.
 *
 * El efectivo PUEDE superar el total: la diferencia es el vuelto. Los
 * medios electrónicos no dan vuelto, así que su suma nunca puede pasarse
 * del total — misma regla que aplica el backend.
 */
export function PaymentPanel({
  total,
  payments,
  methods,
  methodsError,
  totales,
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
  totales: PaymentTotals;
  onChange: (key: string, patch: Partial<PaymentLine>) => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
  /** Completa el pago pendiente en la última fila. */
  onCompletar: () => void;
}) {
  const { pagado, efectivo, electronico, falta, vuelto, excesoElectronico } = totales;
  const mixto = efectivo > 0 && electronico > 0;

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        {payments.map((pago, indice) => {
          const metodo = methods.find((m) => m.id === pago.paymentMethodId);
          // Lo que falta SIN contar esta fila: es lo que tiene que cubrir
          const aporte = metodo === undefined ? 0 : montoDe(pago.amount);
          const faltaDeLaFila = Math.round(Math.max(0, total - (pagado - aporte)) * 100) / 100;

          return (
            <PaymentRow
              key={pago.key}
              pago={pago}
              metodo={metodo}
              methods={methods}
              falta={faltaDeLaFila}
              numero={indice + 1}
              sePuedeQuitar={payments.length > 1}
              onChange={onChange}
              onRemove={onRemove}
            />
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={onAdd} disabled={methods.length === 0}>
          Agregar pago
        </Button>
        {falta > 0 && (
          <Button variant="ghost" size="sm" onClick={onCompletar} disabled={methods.length === 0}>
            Completar {formatMoney(falta)}
          </Button>
        )}
      </div>

      {methodsError !== null && (
        <Alert tone="danger" title="No se pueden cargar los métodos de pago">
          {methodsError}
        </Alert>
      )}

      <div className="space-y-2 border-t border-stone-200 pt-5 text-sm">
        <div className="flex items-center justify-between text-stone-500">
          <span>Pagado</span>
          <span className="tabular">{formatMoney(pagado)}</span>
        </div>
        {mixto && (
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>Efectivo {formatMoney(efectivo)}</span>
            <span>Electrónico {formatMoney(electronico)}</span>
          </div>
        )}
      </div>

      {/* Falta y vuelto son cosas distintas: falta plata vs. sobra y se devuelve */}
      {excesoElectronico ? (
        <Alert tone="danger" title="Revisá los pagos electrónicos">
          Los pagos con tarjeta o transferencia no pueden superar su parte: no dan vuelto. Bajá ese
          monto a {formatMoney(total)} como máximo, o cobrá la diferencia en efectivo.
        </Alert>
      ) : falta > 0 ? (
        <div className="flex items-center justify-between gap-4 rounded-lg bg-red-50 px-4 py-3">
          <span className="text-sm font-medium text-red-700">Falta</span>
          <span className="tabular text-2xl font-semibold text-red-700">{formatMoney(falta)}</span>
        </div>
      ) : vuelto > 0 ? (
        <div className="space-y-1 rounded-lg bg-emerald-50 px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-emerald-800">Vuelto</span>
            <span className="tabular text-3xl font-semibold text-emerald-700">
              {formatMoney(vuelto)}
            </span>
          </div>
          <p className="text-xs text-emerald-700">
            Se devuelve en efectivo. A la caja entra el neto: {formatMoney(efectivo - vuelto)}.
          </p>
        </div>
      ) : (
        pagado > 0 && (
          <p className="flex items-center gap-2 text-sm font-medium text-brand-700">
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="size-4"
            >
              <path d="m4 10.5 4 4 8-9" />
            </svg>
            Pago exacto, sin vuelto
          </p>
        )
      )}

      {totales.faltaMetodo && (
        <p className="text-sm text-amber-600">Elegí el método de cada pago cargado.</p>
      )}

      {methods.some((m) => m.affectsCash) && (
        <p className="text-xs text-stone-400">
          Los cobros en{" "}
          <Badge tone="brand">{methods.find((m) => m.affectsCash)?.name ?? "efectivo"}</Badge>{" "}
          impactan en el turno de caja.
        </p>
      )}
    </div>
  );
}
