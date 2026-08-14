import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, isApiError } from "@/lib/api";
import type { Paginated } from "@/features/products/types";
import type {
  CreatePurchaseBody,
  CreateReceiptBody,
  OverReceiptConflict,
  PurchaseDetail,
  PurchaseListItem,
  PurchaseStatus,
  PurchasesDashboard,
  PurchasesQuery,
  Receipt,
  TransitionConflict,
  UpdatePurchaseBody,
} from "./types";

export const purchaseKeys = {
  all: ["purchases"] as const,
  list: (query: PurchasesQuery) => ["purchases", "list", query] as const,
  detail: (id: number) => ["purchases", "detail", id] as const,
  restock: ["purchases", "restock"] as const,
};

function useInvalidarCompras() {
  const queryClient = useQueryClient();
  return (id?: number) => {
    void queryClient.invalidateQueries({ queryKey: purchaseKeys.all });
    if (id !== undefined) void queryClient.invalidateQueries({ queryKey: purchaseKeys.detail(id) });
    // Una recepción genera stock y mueve costos
    void queryClient.invalidateQueries({ queryKey: ["products"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };
}

export function usePurchases(query: PurchasesQuery) {
  return useQuery({
    queryKey: purchaseKeys.list(query),
    queryFn: async () => {
      const { data } = await api.get<Paginated<PurchaseListItem>>("/api/purchases", {
        params: query,
      });
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

export function usePurchase(id: number | null) {
  return useQuery({
    queryKey: purchaseKeys.detail(id ?? 0),
    enabled: id !== null,
    queryFn: async () => {
      const { data } = await api.get<PurchaseDetail>(`/api/purchases/${id}`);
      return data;
    },
  });
}

export function useCreatePurchase() {
  const invalidar = useInvalidarCompras();

  return useMutation({
    mutationFn: async (body: CreatePurchaseBody) => {
      const { data } = await api.post<PurchaseDetail>("/api/purchases", body);
      return data;
    },
    onSuccess: (compra) => invalidar(compra.id),
  });
}

/** Solo funciona en DRAFT o REQUESTED; el resto devuelve 409. */
export function useUpdatePurchase(id: number) {
  const invalidar = useInvalidarCompras();

  return useMutation({
    mutationFn: async (body: UpdatePurchaseBody) => {
      const { data } = await api.patch<PurchaseDetail>(`/api/purchases/${id}`, body);
      return data;
    },
    onSuccess: () => invalidar(id),
  });
}

/** Transición manual de estado. 409 con `{from, to, allowed}` si no aplica. */
export function useChangeStatus(id: number) {
  const invalidar = useInvalidarCompras();

  return useMutation({
    mutationFn: async (status: PurchaseStatus) => {
      const { data } = await api.post<PurchaseDetail>(`/api/purchases/${id}/status`, { status });
      return data;
    },
    onSuccess: () => invalidar(id),
  });
}

/**
 * Recepción de mercadería: genera lotes, acumula `receivedQty` y
 * recalcula los costos del producto. Requiere `purchases.receive`.
 */
export function useCreateReceipt(purchaseId: number) {
  const invalidar = useInvalidarCompras();

  return useMutation({
    mutationFn: async (body: CreateReceiptBody) => {
      const { data } = await api.post<Receipt>(`/api/purchases/${purchaseId}/receipts`, body);
      return data;
    },
    onSuccess: () => invalidar(purchaseId),
  });
}

/** Productos por debajo del mínimo, del panel de compras. */
export function useRestockList() {
  return useQuery({
    queryKey: purchaseKeys.restock,
    queryFn: async () => {
      const { data } = await api.get<PurchasesDashboard>("/api/dashboard/purchases");
      return data;
    },
  });
}

/**
 * Proveedores para el selector. La implementación vive en el módulo de
 * proveedores; acá se reexporta con el nombre que ya usaban las pantallas
 * de compras, para no tener dos consultas equivalentes.
 */
export { useSupplierOptions as useSuppliers } from "@/features/suppliers/api";

// ---------------------------------------------------------------
// Lectura de los 409 que devuelve el módulo
// ---------------------------------------------------------------

function detallesDe(error: unknown): Record<string, unknown> | null {
  if (!isApiError(error)) return null;
  const details = error.response?.data?.error?.details;
  return typeof details === "object" && details !== null
    ? (details as Record<string, unknown>)
    : null;
}

export function conflictoDeRecepcion(error: unknown): OverReceiptConflict | null {
  const details = detallesDe(error);
  return details !== null && "purchaseItemId" in details && "ordered" in details
    ? (details as unknown as OverReceiptConflict)
    : null;
}

export function conflictoDeTransicion(error: unknown): TransitionConflict | null {
  const details = detallesDe(error);
  return details !== null && "from" in details && "allowed" in details
    ? (details as unknown as TransitionConflict)
    : null;
}
