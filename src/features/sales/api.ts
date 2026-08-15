import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { api, isApiError } from "@/lib/api";
import { cashKeys } from "@/features/cash/api";
import { queryClient } from "@/lib/queryClient";
import type { Paginated, ProductListItem } from "@/features/products/types";
import type {
  CreateSaleBody,
  PaymentMethod,
  PriceList,
  ProductDetail,
  SaleCreated,
  SaleDetail,
  SaleListItem,
  SalesQuery,
} from "./types";

export const salesKeys = {
  paymentMethods: ["payment-methods"] as const,
  priceLists: ["price-lists"] as const,
  productSearch: (term: string) => ["pos", "product-search", term] as const,
  list: (query: SalesQuery) => ["sales", "list", query] as const,
  detail: (id: number) => ["sales", "detail", id] as const,
};

/**
 * Ventas ya registradas. Leerlas exige `sales.create`, igual que crearlas
 * (así lo resuelve el backend). Se usa, entre otros, para las compras de
 * un cliente (`?customerId=`).
 */
export function useSales(query: SalesQuery) {
  return useQuery({
    queryKey: salesKeys.list(query),
    queryFn: async () => {
      const { data } = await api.get<Paginated<SaleListItem>>("/api/sales", { params: query });
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

/**
 * Detalle de una venta. Mismo permiso que el listado (`sales.create`).
 * Es lo que alimenta la pantalla de la venta y su comprobante, así que
 * una venta vieja se puede reimprimir tal cual salió.
 */
export function useSale(id: number | null) {
  return useQuery({
    queryKey: salesKeys.detail(id ?? 0),
    enabled: id !== null,
    queryFn: async () => {
      const { data } = await api.get<SaleDetail>(`/api/sales/${id}`);
      return data;
    },
  });
}

/** Catálogos que casi no cambian: no hace falta refrescarlos seguido. */
const CATALOG_STALE_TIME = 5 * 60_000;

/** Métodos de pago activos para cobrar. Requiere `sales.create`. */
export function usePaymentMethods() {
  return useQuery({
    queryKey: salesKeys.paymentMethods,
    queryFn: async () => {
      const { data } = await api.get<PaymentMethod[]>("/api/payment-methods");
      return data;
    },
    staleTime: CATALOG_STALE_TIME,
  });
}

/**
 * Listas de precios activas, con la default primera. El POS toma esa
 * primera como precio base en vez de deducirla de los productos.
 *
 * Leerlas exige `products.view` (no `sales.create`): por eso se puede
 * desactivar, para no disparar un 403 evitable desde pantallas que las
 * usan solo como dato accesorio.
 */
export function usePriceLists(enabled = true) {
  return useQuery({
    queryKey: salesKeys.priceLists,
    queryFn: async () => {
      const { data } = await api.get<PriceList[]>("/api/price-lists");
      return data;
    },
    staleTime: CATALOG_STALE_TIME,
    enabled,
  });
}

/** Búsqueda por texto para el POS. El listado NO trae precios. */
export function useProductSearch(term: string) {
  const search = term.trim();

  return useQuery({
    queryKey: salesKeys.productSearch(search),
    enabled: search.length >= 2,
    queryFn: async () => {
      const { data } = await api.get<Paginated<ProductListItem>>("/api/products", {
        params: { search, pageSize: 8, isActive: true, sortBy: "name", sortDir: "asc" },
      });
      return data.items;
    },
    placeholderData: keepPreviousData,
  });
}

/**
 * Stock vendible de un producto.
 *
 * Sale del LISTADO porque el detalle no lo trae: el backend solo decora
 * con `availableStock` los items del listado. Se busca por SKU, que es
 * único, y devuelve `null` si no se pudo resolver — el POS trata ese
 * caso como "no sé", no como "cero".
 */
async function fetchAvailableStock(sku: string, productId: number): Promise<number | null> {
  try {
    const { data } = await api.get<Paginated<ProductListItem>>("/api/products", {
      params: { search: sku, pageSize: 5 },
    });
    return data.items.find((item) => item.id === productId)?.availableStock ?? null;
  } catch {
    return null;
  }
}

/** Detalle con precios y stock. Necesario antes de sumar al carrito. */
export async function fetchProductDetail(id: number): Promise<ProductDetail> {
  const { data } = await api.get<ProductDetail>(`/api/products/${id}`);
  return { ...data, availableStock: await fetchAvailableStock(data.sku, data.id) };
}

/**
 * Búsqueda exacta por código de barras o SKU (lo que usa el lector).
 * Devuelve `null` en 404 en vez de tirar: "no existe" es un resultado
 * esperable cuando alguien escanea cualquier cosa.
 */
export async function fetchProductByBarcode(code: string): Promise<ProductDetail | null> {
  try {
    const { data } = await api.get<ProductDetail>(
      `/api/products/by-barcode/${encodeURIComponent(code)}`
    );
    return { ...data, availableStock: await fetchAvailableStock(data.sku, data.id) };
  } catch (error) {
    if (isApiError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

/** POST /api/sales — venta completa (stock FIFO + caja) en una transacción. */
export function useCreateSale() {
  return useMutation({
    mutationFn: async (body: CreateSaleBody) => {
      const { data } = await api.post<SaleCreated>("/api/sales", body);
      return data;
    },
    onSuccess: () => {
      // La venta movió el efectivo del turno y el stock
      void queryClient.invalidateQueries({ queryKey: cashKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
