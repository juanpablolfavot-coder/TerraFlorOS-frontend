import { Badge } from "@/components/ui";
import { formatQuantityWithUnit } from "@/lib/format";
import type { AppliedBatch, AppliedRole } from "./types";

const ROLES: Record<AppliedRole, { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  settle_oversold: { label: "Canceló deuda de sobreventa", tone: "success" },
  entry: { label: "Entró en un lote nuevo", tone: "success" },
  exit: { label: "Salió del lote (FIFO)", tone: "neutral" },
  oversold: { label: "Quedó como sobreventa", tone: "danger" },
};

/**
 * Qué hizo el ajuste con cada lote. Vale la pena mostrarlo: una entrada
 * sobre un producto sobrevendido no crea stock nuevo hasta cubrir la
 * deuda, y sin este detalle parecería que "se perdió" mercadería.
 *
 * La respuesta trae `batchId` pero no el código del lote, así que se
 * muestra el número: el código se ve en la tabla de lotes del producto.
 */
export function AppliedList({ applied, unit }: { applied: AppliedBatch[]; unit: string }) {
  if (applied.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-stone-700">Qué se movió</p>
      <ul className="space-y-2">
        {applied.map((linea, indice) => {
          const rol = ROLES[linea.role] ?? { label: linea.role, tone: "neutral" as const };

          return (
            <li
              key={`${linea.batchId}-${linea.role}-${indice}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-stone-50 px-4 py-3"
            >
              <span className="flex items-center gap-2 text-sm text-stone-600">
                <Badge tone={rol.tone}>{rol.label}</Badge>
                <span className="font-mono text-xs text-stone-400">lote #{linea.batchId}</span>
              </span>
              <span className="tabular text-sm font-medium text-stone-900">
                {linea.qty > 0 ? "+" : "−"}
                {formatQuantityWithUnit(Math.abs(linea.qty), unit)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
