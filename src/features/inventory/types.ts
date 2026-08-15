import type { Decimal } from "@/lib/format";

/**
 * Inventario tal como lo devuelve el backend.
 *
 * Los `Decimal` de Prisma llegan como STRING en el JSON (cantidades y
 * costos de los lotes): usar `toNumber()` antes de operar. La vista
 * general (`overview`) es la excepción: ahí el backend ya devuelve
 * números, porque los calcula agregando en SQL.
 *
 * `unitCost` (lotes y movimientos), `averageCost` y `stockValue` SOLO
 * viajan si el usuario tiene `products.view_cost`.
 */

// ---------------------------------------------------------------
// Vista general — GET /api/inventory/overview
// ---------------------------------------------------------------

export interface InventoryRow {
  id: number;
  sku: string;
  name: string;
  unit: string;
  /** Disponible = suma de (currentQty − reservedQty) de los lotes. */
  available: number;
  /** Lotes con cantidad distinta de cero (incluye el de sobreventa). */
  batches: number;
  minStock: number | null;
  /** El disponible quedó por debajo de cero. */
  isNegative: boolean;
  /** Hay un lote de sobreventa con saldo negativo pendiente. */
  hasOversoldBatch: boolean;
  isBelowMin: boolean;
  averageCost?: number;
  stockValue?: number;
}

export interface InventoryOverview {
  branchId: number | null;
  items: InventoryRow[];
  total: number;
  page: number;
  pageSize: number;
}

/** `without_stock` incluye a los negativos; `negative` los aísla. */
export type StockFilter = "negative" | "with_stock" | "without_stock";

export interface OverviewQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: number;
  branchId?: number;
  stock?: StockFilter;
}

// ---------------------------------------------------------------
// Detalle por producto — GET /api/inventory/products/:id
// ---------------------------------------------------------------

export interface StockBatch {
  id: number;
  code: string;
  productId: number;
  branchId: number;
  locationId: number | null;
  supplierId: number | null;
  receivedAt: string;
  unitCost?: Decimal;
  initialQty: Decimal;
  currentQty: Decimal;
  reservedQty: Decimal;
  /** Solo el lote de sobreventa puede quedar en negativo. */
  allowsNegative: boolean;
  healthStatus: string;
  notes: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  location: {
    id: number;
    name: string;
    warehouse: { id: number; name: string; branchId: number };
  } | null;
  supplier: { id: number; legalName: string; tradeName: string | null } | null;
  branch: { id: number; name: string };
  /** `allowsNegative` Y saldo negativo: es deuda pendiente de reponer. */
  isOversell: boolean;
}

export interface ProductStock {
  product: {
    id: number;
    sku: string;
    name: string;
    unit: string;
    kind: "CONVENTIONAL" | "PLANT";
  };
  /** Solo los lotes con cantidad distinta de cero, más viejos primero. */
  batches: StockBatch[];
  totals: { total: number; reserved: number; available: number };
}

// ---------------------------------------------------------------
// Movimientos — GET /api/stock-movements
// ---------------------------------------------------------------

export type MovementType =
  | "PURCHASE"
  | "SALE"
  | "RETURN"
  | "TRANSFER_OUT"
  | "TRANSFER_IN"
  | "ADJUSTMENT"
  | "LOSS"
  | "DEATH"
  | "DISEASE"
  | "BREAKAGE"
  | "SELF_CONSUMPTION"
  | "PRODUCTION_IN"
  | "PRODUCTION_OUT"
  | "RESERVATION"
  | "RESERVATION_RELEASE"
  | "CORRECTION"
  | "VOID";

/** Etiquetas del libro mayor, en el orden del enum del backend. */
export const MOVEMENT_LABELS: Record<MovementType, string> = {
  PURCHASE: "Compra",
  SALE: "Venta",
  RETURN: "Devolución",
  TRANSFER_OUT: "Transferencia (salida)",
  TRANSFER_IN: "Transferencia (entrada)",
  ADJUSTMENT: "Ajuste",
  LOSS: "Pérdida",
  DEATH: "Muerte",
  DISEASE: "Enfermedad",
  BREAKAGE: "Rotura",
  SELF_CONSUMPTION: "Consumo interno",
  PRODUCTION_IN: "Producción (entrada)",
  PRODUCTION_OUT: "Producción (salida)",
  RESERVATION: "Reserva",
  RESERVATION_RELEASE: "Liberación de reserva",
  CORRECTION: "Corrección",
  VOID: "Anulación",
};

export interface StockMovement {
  /** El backend lo serializa como number (en la base es BigInt). */
  id: number;
  type: MovementType;
  productId: number;
  batchId: number | null;
  branchId: number;
  /** Positiva entra, negativa sale. */
  quantity: Decimal;
  stockBefore: Decimal;
  stockAfter: Decimal;
  unitCost?: Decimal | null;
  refType: string | null;
  refId: number | null;
  reason: string | null;
  notes: string | null;
  userId: number;
  createdAt: string;
  product: { id: number; sku: string; name: string };
  batch: { id: number; code: string } | null;
  user: { id: number; username: string };
  branch: { id: number; name: string };
}

export interface MovementsQuery {
  page?: number;
  pageSize?: number;
  productId?: number;
  batchId?: number;
  branchId?: number;
  type?: MovementType;
  dateFrom?: string;
  dateTo?: string;
}

// ---------------------------------------------------------------
// Ajustes — POST /api/inventory/adjustments
// ---------------------------------------------------------------

/** Body de POST /api/inventory/adjustments. El schema es `.strict()`. */
export interface CreateAdjustmentBody {
  productId: number;
  /** Positiva carga, negativa descuenta. Cero es inválido. */
  quantity: number;
  reason: string;
  notes?: string | null;
  branchId?: number;
  /** Solo para entradas; sin esto se usa el costo promedio del producto. */
  unitCost?: number;
  /** Solo para salidas: descontar de un lote puntual en vez de FIFO. */
  batchId?: number;
}

/**
 * Qué hizo el ajuste con cada lote:
 *  - `settle_oversold`: canceló (total o parcialmente) la deuda
 *  - `entry`: creó un lote de ajuste con el excedente
 *  - `exit`: descontó de un lote existente (FIFO)
 *  - `oversold`: lo que no alcanzó quedó como deuda
 */
export type AppliedRole = "settle_oversold" | "entry" | "exit" | "oversold";

export interface AppliedBatch {
  batchId: number;
  qty: number;
  role: AppliedRole;
}

/**
 * Respuesta del ajuste. OJO: NO trae el stock resultante, así que la
 * pantalla lo vuelve a pedir en vez de calcularlo por su cuenta.
 */
export interface AdjustmentResult {
  productId: number;
  branchId: number;
  applied: AppliedBatch[];
}

/** Body de POST /api/inventory/products/:id/settle-oversold (`.strict()`). */
export interface SettleOversoldBody {
  branchId?: number;
  unitCost?: number;
  notes?: string | null;
}

/** Detalle del 409 por stock insuficiente en una salida. */
export interface StockConflict {
  productId: number;
  requested: number;
  available: number;
}
