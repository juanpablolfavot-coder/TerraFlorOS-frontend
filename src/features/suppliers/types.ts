import type { Decimal } from "@/lib/format";

/**
 * Modelo Supplier tal como lo devuelve el backend. Los nombres son los
 * exactos del schema: `legalName` (razón social), `taxId` (CUIT),
 * `deliveryDays` (días de entrega), etc.
 */
export interface Supplier {
  id: number;
  legalName: string;
  tradeName: string | null;
  taxId: string | null;
  contactName: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  deliveryDays: string | null;
  minOrderAmount: Decimal | null;
  paymentTerms: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** POST /api/suppliers — el schema del backend es `.strict()`. */
export interface CreateSupplierBody {
  legalName: string;
  tradeName?: string | null;
  taxId?: string | null;
  contactName?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
  deliveryDays?: string | null;
  minOrderAmount?: number | null;
  paymentTerms?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

export type UpdateSupplierBody = Partial<CreateSupplierBody>;

/**
 * Catálogo del proveedor (`/api/suppliers/:id/products`).
 *
 * `lastCost` y `lastCostDate` SOLO llegan con `products.view_cost`: la
 * misma regla de costos que en el resto del sistema.
 */
export interface SupplierProduct {
  id: number;
  supplierId: number;
  productId: number;
  supplierCode: string | null;
  supplierName: string | null;
  presentation: string | null;
  /** Unidades base por unidad del proveedor (una bandeja x12 → 12). */
  conversionFactor: Decimal;
  lastCost?: Decimal | null;
  lastCostDate?: string | null;
  isPreferred: boolean;
  product: { id: number; sku: string; name: string; unit: string };
}

/** POST /api/suppliers/:id/products */
export interface CreateSupplierProductBody {
  productId: number;
  supplierCode?: string | null;
  supplierName?: string | null;
  presentation?: string | null;
  conversionFactor?: number;
  isPreferred?: boolean;
}

export type UpdateSupplierProductBody = Omit<Partial<CreateSupplierProductBody>, "productId">;

export interface SuppliersQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
}

/** Detalle del 409 al dar de baja un proveedor con compras abiertas. */
export interface OpenPurchasesConflict {
  /** Compras en un estado distinto de RECIBIDA o CANCELADA. */
  openPurchases: number;
}
