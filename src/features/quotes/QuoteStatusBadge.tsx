import { Badge } from "@/components/ui";
import { QUOTE_STATUS_LABEL, type QuoteStatus } from "./types";

const TONO: Record<QuoteStatus, "brand" | "success" | "neutral" | "warning"> = {
  ACTIVE: "brand",
  CONVERTED: "success",
  EXPIRED: "warning",
  CANCELLED: "neutral",
};

/**
 * Estado del presupuesto. Un vencido sigue estando ACTIVE en la base, así
 * que el vencimiento se muestra como una etiqueta aparte y no reemplaza
 * al estado: son dos cosas distintas.
 */
export function QuoteStatusBadge({
  status,
  isExpired = false,
}: {
  status: QuoteStatus;
  isExpired?: boolean;
}) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      <Badge tone={TONO[status]}>{QUOTE_STATUS_LABEL[status] ?? status}</Badge>
      {isExpired && status === "ACTIVE" && <Badge tone="warning">Vencido</Badge>}
    </span>
  );
}
