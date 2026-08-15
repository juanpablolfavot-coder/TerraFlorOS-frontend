import { Badge } from "@/components/ui";
import { formatMoney, toNumber, type Decimal } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * Diferencia de arqueo: contado − esperado.
 *
 * Mismo vocabulario y colores que el diálogo de cierre — cuadra en
 * verde, sobrante en celeste, faltante en ámbar — para que el número
 * signifique lo mismo en las tres pantallas.
 */
export function estadoDeDiferencia(diferencia: number) {
  if (diferencia === 0) return { etiqueta: "Cuadra", tono: "emerald" } as const;
  if (diferencia > 0) return { etiqueta: "Sobrante", tono: "sky" } as const;
  return { etiqueta: "Faltante", tono: "amber" } as const;
}

const TEXTO = { emerald: "text-emerald-700", sky: "text-sky-700", amber: "text-amber-700" };
const FONDO = { emerald: "bg-emerald-50", sky: "bg-sky-50", amber: "bg-amber-50" };
const BADGE = { emerald: "success", sky: "info", amber: "warning" } as const;

/** Versión compacta, para una celda de la tabla. */
export function CashDifference({ value }: { value: Decimal | null }) {
  if (value === null) return <span className="text-stone-400">—</span>;

  const diferencia = toNumber(value);
  const { etiqueta, tono } = estadoDeDiferencia(diferencia);

  return (
    <span className="flex items-center justify-end gap-2">
      <span className={cn("tabular font-semibold", TEXTO[tono])}>
        {diferencia === 0
          ? formatMoney(0)
          : `${diferencia > 0 ? "+" : "−"} ${formatMoney(Math.abs(diferencia))}`}
      </span>
      {diferencia !== 0 && <Badge tone={BADGE[tono]}>{etiqueta}</Badge>}
    </span>
  );
}

/** Versión grande, para el arqueo del detalle. */
export function CashDifferenceBlock({ value }: { value: Decimal }) {
  const diferencia = toNumber(value);
  const { etiqueta, tono } = estadoDeDiferencia(diferencia);

  return (
    <div className={cn("space-y-1 rounded-lg px-4 py-3", FONDO[tono])}>
      <p className={cn("text-sm font-medium", TEXTO[tono])}>
        {diferencia === 0 ? "La caja cuadra" : etiqueta}
      </p>
      <p className={cn("tabular text-3xl font-semibold tracking-tight", TEXTO[tono])}>
        {formatMoney(Math.abs(diferencia))}
      </p>
      <p className="text-xs text-stone-500">
        {diferencia === 0
          ? "Lo contado coincide con lo esperado."
          : diferencia > 0
            ? "Se contó más efectivo del esperado."
            : "Se contó menos efectivo del esperado."}
      </p>
    </div>
  );
}
