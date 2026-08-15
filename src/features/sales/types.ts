import type { Decimal } from "@/lib/format";
import type { ProductListItem } from "@/features/products/types";

/** GET /api/payment-methods — solo los activos, ordenados por id. */
export interface PaymentMethod {
  id: number;
  name: string;
  affectsCash: boolean;
}

/**
 * GET /api/price-lists — solo las activas, con la default PRIMERA
 * (el backend ordena por isDefault desc y después por nombre).
 */
export interface PriceList {
  id: number;
  name: string;
  isDefault: boolean;
}

export interface PriceListRef {
  id: number;
  name: string;
}

export interface ProductPrice {
  priceListId: number;
  price: Decimal;
  priceList: PriceListRef;
}

/**
 * Detalle de producto (`GET /api/products/:id` y `/by-barcode/:code`).
 * A diferencia del listado, ESTE sí trae `prices`: por eso el POS pide el
 * detalle antes de sumar un producto al carrito.
 *
 * `availableStock` NO viene del detalle (lo agrega solo el listado), así
 * que se resuelve aparte y puede ser `null` si no se pudo averiguar.
 */
export interface ProductDetail
  extends Omit<ProductListItem, "defaultPrice" | "availableStock"> {
  prices: ProductPrice[];
  barcodes: Array<{ id: number; barcode: string }>;
  availableStock: number | null;
}

/** Línea del carrito, ya con el precio resuelto del lado del cliente. */
export interface CartLine {
  productId: number;
  sku: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  /** Precio de la lista elegida; sirve para marcar cuándo se está bonificando. */
  listPrice: number | null;
  /** Stock vendible al momento de agregarlo. `null` si no se pudo saber. */
  availableStock: number | null;
  discount: number;
  /** Precios del producto: permiten recalcular si cambia la lista elegida. */
  prices: ProductPrice[];
}

export interface PaymentLine {
  /** Id local de la fila, no viaja al backend. */
  key: string;
  paymentMethodId: number | null;
  /**
   * Monto COMO TEXTO, tal cual lo tipea el cajero (acepta coma decimal).
   * Guardarlo como number obligaba a reformatear en cada tecla y comía los
   * decimales a medio escribir; se convierte recién al enviar.
   */
  amount: string;
}

/** POST /api/sales */
export interface CreateSaleBody {
  registerId: number;
  items: Array<{
    productId: number;
    quantity: number;
    unitPrice?: number;
    discount?: number;
  }>;
  payments: Array<{
    paymentMethodId: number;
    amount: number;
    reference?: string | null;
  }>;
  customerId?: number | null;
  notes?: string | null;
}

/** Venta creada, tal como la devuelve el backend (201). */
export interface SaleCreated {
  id: number;
  number: string;
  /** El cliente elegido, si la venta se asoció a uno. */
  customer: { id: number; name: string; segment: string } | null;
  total: Decimal;
  subtotal: Decimal;
  discount: Decimal;
  /**
   * Vuelto entregado. Queda persistido en la venta, así que un comprobante
   * reimpreso muestra lo mismo que el original. Los `payments` van por el
   * BRUTO entregado: siempre se cumple suma(payments) − changeGiven = total.
   */
  changeGiven: Decimal;
  /** La venta se hizo sin stock disponible (queda por regularizar). */
  oversold: boolean;
  status: "COMPLETED" | "VOIDED";
  items: Array<{
    id: number;
    productId: number;
    quantity: Decimal;
    unitPrice: Decimal;
    total: Decimal;
    product: { id: number; sku: string; name: string; unit: string };
  }>;
  payments: Array<{
    id: number;
    amount: Decimal;
    paymentMethod: { id: number; name: string; affectsCash: boolean };
  }>;
}

/**
 * `GET /api/sales/:id` — la venta completa, para el detalle y el
 * comprobante reimpreso.
 *
 * Trae lo mismo que la respuesta del POS más el contexto: sucursal,
 * vendedor, fecha, anulación y la lista de precios con la que se
 * facturó. OJO con esos dos últimos: `priceList`, `costTotal` y `margin`
 * son datos INTERNOS y no van en el documento que ve el cliente.
 */
export interface SaleDetail extends Omit<SaleCreated, "items" | "payments"> {
  createdAt: string;
  notes: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  branch: { id: number; name: string };
  seller: { id: number; username: string; fullName: string };
  cashSessionId: number | null;
  priceList: { id: number; name: string } | null;
  costTotal?: Decimal;
  margin?: number;
  items: Array<{
    id: number;
    productId: number;
    quantity: Decimal;
    unitPrice: Decimal;
    discount: Decimal;
    total: Decimal;
    unitCost?: Decimal;
    product: { id: number; sku: string; name: string; unit: string };
  }>;
  payments: Array<{
    id: number;
    amount: Decimal;
    reference: string | null;
    createdAt: string;
    paymentMethod: { id: number; name: string; affectsCash: boolean };
  }>;
}

/**
 * Fila de `GET /api/sales`. `costTotal` y `margin` solo llegan con
 * `products.view_cost`, igual que en el resto del sistema.
 */
export interface SaleListItem {
  id: number;
  number: string;
  branchId: number;
  customerId: number | null;
  priceListId: number | null;
  status: "COMPLETED" | "VOIDED";
  subtotal: Decimal;
  discount: Decimal;
  total: Decimal;
  costTotal?: Decimal;
  margin?: number;
  voidedAt: string | null;
  createdAt: string;
  seller: { id: number; username: string };
  customer: { id: number; name: string } | null;
  branch: { id: number; name: string };
  _count: { items: number };
}

export interface SalesQuery {
  page?: number;
  pageSize?: number;
  customerId?: number;
  sellerId?: number;
  branchId?: number;
  status?: "COMPLETED" | "VOIDED";
  number?: string;
}

/** Detalle del 409 por falta de stock. */
export interface StockConflictDetails {
  productId: number;
  requested: number;
  available: number;
}
