import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api, isApiError } from "@/lib/api";
import { productKeys } from "@/features/products/api";
import { queryClient } from "@/lib/queryClient";
import type { Paginated, ProductDetail, ProductListItem } from "@/features/products/types";

/**
 * Consultas de la pantalla de precios. Todo es de solo lectura y todo
 * pide `products.view`, el mismo permiso de la pantalla.
 */

export const priceLookupKeys = {
  search: (term: string) => ["price-lookup", "search", term] as const,
  stock: (sku: string) => ["price-lookup", "stock", sku] as const,
};

/** Búsqueda por texto: nombre, SKU, código interno, código de barras o nombre científico. */
export function useProductSearch(term: string) {
  const search = term.trim();

  return useQuery({
    queryKey: priceLookupKeys.search(search),
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
 * Búsqueda exacta por código de barras o SKU, la que dispara el lector.
 * Devuelve `null` en 404: "no existe" es un resultado esperable.
 *
 * El detalle se guarda en la caché con la clave del módulo de productos,
 * así la pantalla no lo vuelve a pedir apenas lo selecciona.
 */
export async function fetchProductByCode(code: string): Promise<ProductDetail | null> {
  try {
    const { data } = await api.get<ProductDetail>(
      `/api/products/by-barcode/${encodeURIComponent(code)}`
    );
    queryClient.setQueryData(productKeys.detail(data.id), data);
    return data;
  } catch (error) {
    if (isApiError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

/**
 * Stock disponible del producto.
 *
 * Sale del LISTADO y no del detalle porque el backend solo decora con
 * `availableStock` los items del listado; `GET /api/products/:id` no lo
 * trae. Se busca por SKU, que es único, y se confirma por id.
 */
export function useAvailableStock(sku: string | null, productId: number | null) {
  return useQuery({
    queryKey: priceLookupKeys.stock(sku ?? ""),
    enabled: sku !== null && productId !== null,
    queryFn: async () => {
      const { data } = await api.get<Paginated<ProductListItem>>("/api/products", {
        params: { search: sku, pageSize: 5 },
      });
      return data.items.find((item) => item.id === productId) ?? null;
    },
  });
}
