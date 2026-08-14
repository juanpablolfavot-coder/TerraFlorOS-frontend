import type { Decimal } from "@/lib/format";

/**
 * Estados de una orden de compra. Los de recepción
 * (PARTIALLY_RECEIVED / RECEIVED) NO se ponen a mano: los pone el
 * backend al registrar una recepción.
 */
export type PurchaseStatus =
  | "DRAFT"
  | "REQUESTED"
  | "APPROVED"
  | "SENT"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CANCELLED";

/**
 * Transiciones MANUALES que acepta POST /:id/status, copiadas de
 * MANUAL_TRANSITIONS del backend. Sirven para mostrar solo los botones
 * válidos; el backend igual valida y responde 409 con `{from,to,allowed}`.
 */
export const MANUAL_TRANSITIONS: Record<PurchaseStatus, PurchaseStatus[]> = {
  DRAFT: ["REQUESTED", "CANCELLED"],
  REQUESTED: ["APPROVED", "CANCELLED"],
  APPROVED: ["SENT", "CANCELLED"],
  SENT: ["CANCELLED"],
  PARTIALLY_RECEIVED: ["CANCELLED"],
  RECEIVED: [],
  CANCELLED: [],
};

/** Estados desde los que se puede recibir mercadería. */
export const RECEIVABLE_STATUSES: PurchaseStatus[] = [
  "APPROVED",
  "SENT",
  "PARTIALLY_RECEIVED",
];

/** Solo se puede editar la orden en estos estados (409 en el resto). */
export const EDITABLE_STATUSES: PurchaseStatus[] = ["DRAFT", "REQUESTED"];

export const PURCHASE_STATUS_LABEL: Record<PurchaseStatus, string> = {
  DRAFT: "Borrador",
  REQUESTED: "Solicitada",
  APPROVED: "Aprobada",
  SENT: "Enviada",
  PARTIALLY_RECEIVED: "Recibida en parte",
  RECEIVED: "Recibida",
  CANCELLED: "Cancelada",
};

export interface SupplierRef {
  id: number;
  legalName: string;
  tradeName: string | null;
}

/** Fila del listado: trae proveedor, sucursal y conteos. */
export interface PurchaseListItem {
  id: number;
  branchId: number;
  supplierId: number;
  status: PurchaseStatus;
  orderDate: string;
  expectedDate: string | null;
  subtotal: Decimal;
  discount: Decimal;
  taxes: Decimal;
  freightCost: Decimal;
  otherCosts: Decimal;
  total: Decimal;
  paymentTerms: string | null;
  notes: string | null;
  supplier: SupplierRef;
  branch: { id: number; name: string };
  _count: { items: number; receipts: number };
}

export interface PurchaseItem {
  id: number;
  purchaseId: number;
  productId: number;
  quantity: Decimal;
  unitCost: Decimal;
  /** `lastCost` del producto al momento de crear la orden. */
  previousCost: Decimal | null;
  receivedQty: Decimal;
  notes: string | null;
  product: { id: number; sku: string; name: string; unit: string };
  /**
   * Porcentaje de aumento sobre `previousCost`, SOLO si supera el umbral
   * configurado (`purchases.cost_increase_alert_pct`). `null` si no.
   */
  costIncreaseAlert: number | null;
}

export interface ReceiptItem {
  id: number;
  purchaseReceiptId: number;
  purchaseItemId: number;
  productId: number;
  quantity: Decimal;
  unitCost: Decimal;
  batchId: number | null;
  condition: string | null;
  notes: string | null;
  product: { id: number; sku: string; name: string } | null;
  /** Lote generado por esta línea, con su código legible. */
  batch: { id: number; code: string } | null;
}

export interface Receipt {
  id: number;
  purchaseId: number;
  receivedAt: string;
  receivedById: number;
  notes: string | null;
  items: ReceiptItem[];
}

/** GET /api/purchases/:id */
export interface PurchaseDetail extends Omit<PurchaseListItem, "_count"> {
  items: PurchaseItem[];
  /** El detalle ya incluye las recepciones: no hace falta pedirlas aparte. */
  receipts: Array<Omit<Receipt, "items"> & { items: Omit<ReceiptItem, "product" | "batch">[] }>;
  /** Umbral vigente de alerta de suba de costo, en porcentaje. */
  costIncreaseAlertPct: number;
}

/** POST /api/purchases — `.strict()`; `branchId` es obligatorio. */
export interface CreatePurchaseBody {
  branchId: number;
  supplierId: number;
  expectedDate?: string | null;
  discount?: number;
  taxes?: number;
  freightCost?: number;
  otherCosts?: number;
  paymentTerms?: string | null;
  notes?: string | null;
  items: Array<{
    productId: number;
    quantity: number;
    unitCost: number;
    notes?: string | null;
  }>;
}

/** PATCH: si viene `items`, REEMPLAZA todos los de la orden. */
export type UpdatePurchaseBody = Partial<Omit<CreatePurchaseBody, "branchId">>;

/** POST /api/purchases/:id/receipts */
export interface CreateReceiptBody {
  notes?: string | null;
  items: Array<{
    purchaseItemId: number;
    quantity: number;
    unitCost?: number;
    condition?: string | null;
    locationId?: number | null;
    notes?: string | null;
  }>;
}

/** Detalle del 409 cuando se intenta recibir de más. */
export interface OverReceiptConflict {
  purchaseItemId: number;
  ordered: number;
  alreadyReceived: number;
  attempted: number;
}

/** Detalle del 409 de una transición inválida. */
export interface TransitionConflict {
  from: PurchaseStatus;
  to: PurchaseStatus;
  allowed: PurchaseStatus[];
}

export interface PurchasesQuery {
  page?: number;
  pageSize?: number;
  status?: PurchaseStatus;
  supplierId?: number;
  branchId?: number;
  dateFrom?: string;
  dateTo?: string;
}

/** GET /api/dashboard/purchases */
export interface PurchasesDashboard {
  branchId: number | null;
  pending: {
    total: number;
    byStatus: Array<{ status: string; count: number; amount?: number }>;
    amount?: number;
  };
  toRestock: {
    count: number;
    products: Array<{
      id: number;
      sku: string;
      name: string;
      available: number;
      minStock: number;
    }>;
  };
}
