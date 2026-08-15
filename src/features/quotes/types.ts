import type { Decimal } from "@/lib/format";

/**
 * Presupuestos (`/api/quotes`). Un presupuesto NO toca stock ni caja:
 * es una cotización con los precios CONGELADOS al momento de crearla.
 */

/**
 * Estados del enum del backend.
 *
 * `EXPIRED` existe en el enum pero **ningún código lo escribe**: el
 * vencimiento se calcula al vuelo comparando `expiresAt` con el momento
 * actual y viaja en el flag `isExpired`. Un presupuesto vencido sigue
 * estando `ACTIVE` en la base.
 */
export type QuoteStatus = "ACTIVE" | "CONVERTED" | "EXPIRED" | "CANCELLED";

/** Estados que el backend realmente escribe hoy, para filtrar. */
export const QUOTE_STATUSES: QuoteStatus[] = ["ACTIVE", "CONVERTED", "CANCELLED"];

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  ACTIVE: "Activo",
  CONVERTED: "Convertido",
  EXPIRED: "Vencido",
  CANCELLED: "Cancelado",
};

interface QuoteBase {
  id: number;
  number: string;
  branchId: number;
  customerId: number | null;
  priceListId: number;
  status: QuoteStatus;
  subtotal: Decimal;
  discount: Decimal;
  total: Decimal;
  createdById: number;
  /** Venta generada al convertir. `null` mientras no se convierta. */
  saleId: number | null;
  expiresAt: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  /** Lo calcula el backend contra la hora del servidor, no del navegador. */
  isExpired: boolean;
}

/** Fila de `GET /api/quotes`. No trae los items, solo cuántos son. */
export interface QuoteListItem extends QuoteBase {
  customer: { id: number; name: string } | null;
  branch: { id: number; name: string };
  createdBy: { id: number; username: string };
  _count: { items: number };
}

export interface QuoteItem {
  id: number;
  quoteId: number;
  productId: number;
  quantity: Decimal;
  /** CONGELADO al crear: no se recalcula aunque cambie la lista. */
  unitPrice: Decimal;
  discount: Decimal;
  total: Decimal;
  product: { id: number; sku: string; name: string; unit: string };
}

/** `GET /api/quotes/:id`: además de los items trae la lista y el cliente. */
export interface QuoteDetail extends QuoteBase {
  customer: { id: number; name: string; segment: string } | null;
  branch: { id: number; name: string };
  priceList: { id: number; name: string };
  createdBy: { id: number; username: string; fullName: string };
  items: QuoteItem[];
}

/** POST /api/quotes — `.strict()`. `branchId` sale del usuario si no viaja. */
export interface CreateQuoteBody {
  branchId?: number;
  customerId?: number | null;
  notes?: string | null;
  items: Array<{
    productId: number;
    quantity: number;
    unitPrice?: number;
    discount?: number;
  }>;
}

/** PATCH /api/quotes/:id — mandar `items` reemplaza TODOS y recongela. */
export type UpdateQuoteBody = Omit<Partial<CreateQuoteBody>, "branchId">;

/**
 * POST /api/quotes/:id/convert — solo lo que el presupuesto no tiene.
 * Los items y sus precios salen del presupuesto, no del body.
 */
export interface ConvertQuoteBody {
  registerId: number;
  payments: Array<{
    paymentMethodId: number;
    amount: number;
    reference?: string | null;
  }>;
  notes?: string | null;
}

export interface QuotesQuery {
  page?: number;
  pageSize?: number;
  status?: QuoteStatus;
  customerId?: number;
  dateFrom?: string;
  dateTo?: string;
  number?: string;
}
