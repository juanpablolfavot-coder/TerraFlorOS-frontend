import type { Decimal } from "@/lib/format";

/**
 * Modelo de producto del backend.
 *
 * Los campos `Decimal` de Prisma llegan como STRING en el JSON: usar
 * `toNumber()` de lib/format antes de operar con ellos.
 *
 * `lastCost` y `averageCost` solo viajan si el usuario tiene
 * `products.view_cost` (lo filtra products.serializer en el backend).
 */
export type ProductKind = "CONVENTIONAL" | "PLANT";

export interface ProductListItem {
  id: number;
  kind: ProductKind;
  sku: string;
  internalCode: string | null;
  name: string;
  description: string | null;
  categoryId: number | null;
  unit: string;
  unitsPerTray: Decimal | null;
  lastCost?: Decimal;
  averageCost?: Decimal;
  minStock: Decimal | null;
  optimalStock: Decimal | null;
  maxStock: Decimal | null;
  mainSupplierId: number | null;
  imageUrl: string | null;
  isActive: boolean;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  category: { id: number; name: string } | null;
  plantDetail: {
    commonName: string | null;
    scientificName: string | null;
    sizeLabel: string | null;
  } | null;
}

/** Envoltorio de listado que devuelve el backend. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ProductsQuery {
  page?: number;
  pageSize?: number;
  kind?: ProductKind;
  categoryId?: number;
  isActive?: boolean;
  isFavorite?: boolean;
  search?: string;
  sortBy?: "name" | "sku" | "createdAt";
  sortDir?: "asc" | "desc";
}

/** GET /api/categories devuelve el árbol (máximo 2 niveles). */
export interface CategoryNode {
  id: number;
  name: string;
  parentId: number | null;
  isActive: boolean;
  children: CategoryNode[];
}
