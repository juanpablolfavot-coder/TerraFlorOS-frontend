import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { api, isApiError } from "@/lib/api";
import { cashKeys } from "@/features/cash/api";
import { queryClient } from "@/lib/queryClient";
import type { Paginated, ProductListItem } from "@/features/products/types";
import type { CreateSaleBody, PaymentMethod, PriceList, ProductDetail, SaleCreated } from "./types";

export const salesKeys = {
  paymentMethods: ["payment-methods"] as const,
  priceLists: ["price-lists"] as const,
  productSearch: (term: string) => ["pos", "product-search", term] as const,
};

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
 */
export function usePriceLists() {
  return useQuery({
    queryKey: salesKeys.priceLists,
    queryFn: async () => {
      const { data } = await api.get<PriceList[]>("/api/price-lists");
      return data;
    },
    staleTime: CATALOG_STALE_TIME,
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

/** Detalle con precios. Necesario antes de sumar al carrito. */
export async function fetchProductDetail(id: number): Promise<ProductDetail> {
  const { data } = await api.get<ProductDetail>(`/api/products/${id}`);
  return data;
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
    return data;
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
