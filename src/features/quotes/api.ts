import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, isApiError } from "@/lib/api";
import { cashKeys } from "@/features/cash/api";
import type { Paginated } from "@/features/products/types";
import type { SaleCreated } from "@/features/sales/types";
import type {
  ConvertQuoteBody,
  CreateQuoteBody,
  QuoteDetail,
  QuoteListItem,
  QuotesQuery,
  UpdateQuoteBody,
} from "./types";

export const quoteKeys = {
  all: ["quotes"] as const,
  list: (query: QuotesQuery) => ["quotes", "list", query] as const,
  detail: (id: number) => ["quotes", "detail", id] as const,
};

/** Todo el módulo pide `sales.create`: quien puede vender puede presupuestar. */
export function useQuotes(query: QuotesQuery) {
  return useQuery({
    queryKey: quoteKeys.list(query),
    queryFn: async () => {
      const { data } = await api.get<Paginated<QuoteListItem>>("/api/quotes", { params: query });
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useQuote(id: number | null) {
  return useQuery({
    queryKey: quoteKeys.detail(id ?? 0),
    enabled: id !== null,
    queryFn: async () => {
      const { data } = await api.get<QuoteDetail>(`/api/quotes/${id}`);
      return data;
    },
  });
}

function useInvalidarPresupuestos() {
  const queryClient = useQueryClient();
  return (id?: number) => {
    void queryClient.invalidateQueries({ queryKey: quoteKeys.all });
    if (id !== undefined) void queryClient.invalidateQueries({ queryKey: quoteKeys.detail(id) });
  };
}

export function useCreateQuote() {
  const invalidar = useInvalidarPresupuestos();

  return useMutation({
    mutationFn: async (body: CreateQuoteBody) => {
      const { data } = await api.post<QuoteDetail>("/api/quotes", body);
      return data;
    },
    onSuccess: (quote) => invalidar(quote.id),
  });
}

/** Solo se edita mientras esté activo y no vencido: si no, 409. */
export function useUpdateQuote(id: number) {
  const invalidar = useInvalidarPresupuestos();

  return useMutation({
    mutationFn: async (body: UpdateQuoteBody) => {
      const { data } = await api.patch<QuoteDetail>(`/api/quotes/${id}`, body);
      return data;
    },
    onSuccess: () => invalidar(id),
  });
}

/** Cancelar solo aplica a un presupuesto activo (vencido incluido). */
export function useCancelQuote(id: number) {
  const invalidar = useInvalidarPresupuestos();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<QuoteDetail>(`/api/quotes/${id}/cancel`, undefined);
      return data;
    },
    onSuccess: () => invalidar(id),
  });
}

/**
 * Conversión a venta. Devuelve `{ quote, sale }`: el presupuesto ya en
 * CONVERTED y la venta completa (con su número y el vuelto).
 *
 * El presupuesto NO reserva stock, así que esto puede fallar con 409 si
 * la mercadería se vendió en el medio; en ese caso el presupuesto sigue
 * activo porque el backend hace todo en una transacción.
 */
export function useConvertQuote(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: ConvertQuoteBody) => {
      const { data } = await api.post<{ quote: QuoteDetail; sale: SaleCreated }>(
        `/api/quotes/${id}/convert`,
        body
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: quoteKeys.all });
      // La venta movió el efectivo del turno y el stock
      void queryClient.invalidateQueries({ queryKey: cashKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

/** Detalle del 409 por falta de stock al convertir. */
export interface StockConflict {
  productId: number;
  requested: number;
  available: number;
}

export function conflictoDeStock(error: unknown): StockConflict | null {
  if (!isApiError(error)) return null;
  const details = error.response?.data?.error?.details;
  return typeof details === "object" && details !== null && "available" in details
    ? (details as unknown as StockConflict)
    : null;
}
