import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { api, isApiError } from "@/lib/api";
import { cashKeys } from "@/features/cash/api";
import { queryClient } from "@/lib/queryClient";
import type { Paginated, ProductListItem } from "@/features/products/types";
import type { CreateSaleBody, PaymentMethod, ProductDetail, SaleCreated } from "./types";

export const salesKeys = {
  paymentMethods: ["payment-methods"] as const,
  productSearch: (term: string) => ["pos", "product-search", term] as const,
};

/**
 * Métodos de pago.
 *
 * OJO: al día de hoy el backend NO expone este endpoint (no hay router de
 * payment_methods en app.ts). Se deja pedido contra la ruta natural para
 * que funcione apenas se agregue; mientras tanto falla y el panel de
 * cobro lo informa.
 *
 * No se cablean ids fijos a propósito: los ids del seed no están
 * garantizados y cobrar con el método equivocado sería un error silencioso
 * en los datos, peor que no poder cobrar.
 */
export function usePaymentMethods() {
  return useQuery({
    queryKey: salesKeys.paymentMethods,
    queryFn: async () => {
      const { data } = await api.get<PaymentMethod[]>("/api/payment-methods");
      return data.filter((method) => method.isActive !== false);
    },
  });
}

/**
 * No hay hook de listas de precios porque el backend tampoco expone
 * `/api/price-lists`, y pedirlo sería un 404 en cada carga del POS. Las
 * listas se deducen de los precios de los productos cargados y el
 * operador elige cuál aplicar (ver PosPage). Si algún día existe el
 * endpoint, conviene usar su `isDefault` en vez de la deducción.
 */

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
