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

// ---------------------------------------------------------------
// Ficha botánica
// ---------------------------------------------------------------

/**
 * `plantDetail` del backend: todos los campos son opcionales y aceptan
 * `null`. Los booleanos son de TRES estados — true / false / null — y
 * `null` significa "sin dato", no "no".
 */
export interface PlantDetail {
  commonName: string | null;
  scientificName: string | null;
  genus: string | null;
  species: string | null;
  variety: string | null;
  cultivar: string | null;
  botanicalFamily: string | null;
  sizeLabel: string | null;
  heightCm: number | null;
  potSizeNumber: number | null;
  containerLiters: Decimal | null;
  approxAgeMonths: number | null;
  environment: string | null;
  lightRequirement: string | null;
  wateringFrequency: string | null;
  humidity: string | null;
  minTempC: number | null;
  maxTempC: number | null;
  frostTolerant: boolean | null;
  heatResistant: boolean | null;
  season: string | null;
  floweringSeason: string | null;
  fruitingSeason: string | null;
  growthRate: string | null;
  adultHeightM: Decimal | null;
  adultDiameterM: Decimal | null;
  soilType: string | null;
  phRange: string | null;
  isToxic: boolean | null;
  petFriendly: boolean | null;
  indoorSuitable: boolean | null;
  difficultyLevel: string | null;
  careNotes: string | null;
}

// ---------------------------------------------------------------
// Detalle de producto
// ---------------------------------------------------------------

export interface ProductBarcode {
  id: number;
  productId: number;
  barcode: string;
}

export interface ProductPriceRow {
  productId: number;
  priceListId: number;
  price: Decimal;
  updatedAt: string;
  priceList: { id: number; name: string };
}

/**
 * `GET /api/products/:id`. A diferencia del listado trae precios,
 * códigos de barras y la ficha completa.
 */
export interface ProductDetail extends Omit<ProductListItem, "plantDetail"> {
  category: { id: number; name: string; parentId: number | null } | null;
  plantDetail: PlantDetail | null;
  barcodes: ProductBarcode[];
  prices: ProductPriceRow[];
  mainSupplier: { id: number; legalName: string; tradeName: string | null } | null;
}

// ---------------------------------------------------------------
// Altas y ediciones
// ---------------------------------------------------------------

/** Body de POST /api/products. El schema del backend es `.strict()`. */
export interface CreateProductBody {
  kind: ProductKind;
  sku: string;
  name: string;
  internalCode?: string | null;
  description?: string | null;
  categoryId?: number | null;
  unit?: string;
  unitsPerTray?: number | null;
  minStock?: number | null;
  optimalStock?: number | null;
  maxStock?: number | null;
  mainSupplierId?: number | null;
  imageUrl?: string | null;
  isActive?: boolean;
  isFavorite?: boolean;
  plantDetail?: Partial<PlantDetailInput>;
}

/** PATCH /api/products/:id — igual pero sin `kind` (el tipo no se cambia). */
export type UpdateProductBody = Partial<Omit<CreateProductBody, "kind">>;

/** Lo que se manda en `plantDetail`: números, no Decimal. */
export interface PlantDetailInput
  extends Omit<PlantDetail, "containerLiters" | "adultHeightM" | "adultDiameterM"> {
  containerLiters: number | null;
  adultHeightM: number | null;
  adultDiameterM: number | null;
}

// ---------------------------------------------------------------
// Precios
// ---------------------------------------------------------------

/** PUT /api/products/:id/prices — array plano, mínimo un ítem. */
export type PutPricesBody = Array<{ priceListId: number; price: number }>;

/** GET /api/products/:id/price-history — más reciente primero. */
export interface PriceHistoryEntry {
  id: number;
  priceListId: number;
  priceList: string | null;
  oldPrice: Decimal | null;
  newPrice: Decimal;
  userId: number;
  reason: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------
// Proveedores (solo para el selector del formulario)
// ---------------------------------------------------------------

export interface SupplierOption {
  id: number;
  legalName: string;
  tradeName: string | null;
}
