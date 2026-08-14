import { Badge } from "@/components/ui";
import { PURCHASE_STATUS_LABEL, type PurchaseStatus } from "./types";

/** Un color por estado, para reconocer la etapa de un vistazo. */
const TONO: Record<PurchaseStatus, "neutral" | "brand" | "success" | "warning" | "danger" | "info"> =
  {
    DRAFT: "neutral",
    REQUESTED: "info",
    APPROVED: "brand",
    SENT: "info",
    PARTIALLY_RECEIVED: "warning",
    RECEIVED: "success",
    CANCELLED: "danger",
  };

export function PurchaseStatusBadge({ status }: { status: PurchaseStatus }) {
  return <Badge tone={TONO[status]}>{PURCHASE_STATUS_LABEL[status]}</Badge>;
}
