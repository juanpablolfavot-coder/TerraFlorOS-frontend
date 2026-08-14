import type { Decimal } from "@/lib/format";
import type { ProductListItem } from "@/features/products/types";

/** GET /api/payment-methods (ver nota en api.ts: hoy el backend no lo expone). */
export interface PaymentMethod {
  id: number;
  name: string;
  affectsCash: boolean;
  isActive?: boolean;
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
 */
export interface ProductDetail extends ProductListItem {
  prices: ProductPrice[];
  barcodes: Array<{ id: number; barcode: string }>;
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
  discount: number;
  /** Precios del producto: permiten recalcular si cambia la lista elegida. */
  prices: ProductPrice[];
}

export interface PaymentLine {
  /** Id local de la fila, no viaja al backend. */
  key: string;
  paymentMethodId: number | null;
  amount: number;
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
  total: Decimal;
  subtotal: Decimal;
  discount: Decimal;
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

/** Detalle del 409 por falta de stock. */
export interface StockConflictDetails {
  productId: number;
  requested: number;
  available: number;
}
