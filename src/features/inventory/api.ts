import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, isApiError } from "@/lib/api";
import { productKeys } from "@/features/products/api";
import type { Paginated } from "@/features/products/types";
import type {
  AdjustmentResult,
  CreateAdjustmentBody,
  InventoryOverview,
  MovementsQuery,
  OverviewQuery,
  ProductStock,
  SettleOversoldBody,
  StockConflict,
  StockMovement,
} from "./types";

export const inventoryKeys = {
  all: ["inventory"] as const,
  overview: (query: OverviewQuery) => ["inventory", "overview", query] as const,
  product: (id: number) => ["inventory", "product", id] as const,
  movements: (query: MovementsQuery) => ["inventory", "movements", query] as const,
};

/**
 * Vista general del inventario. Requiere `stock.view`.
 *
 * El backend filtra por sucursal con la del usuario cuando no se manda
 * `branchId`, así que la pantalla no necesita elegirla.
 */
export function useInventoryOverview(query: OverviewQuery) {
  return useQuery({
    queryKey: inventoryKeys.overview(query),
    queryFn: async () => {
      const { data } = await api.get<InventoryOverview>("/api/inventory/overview", {
        params: query,
      });
      return data;
    },
    // Al cambiar de página o filtro se mantiene la tabla anterior en
    // pantalla en vez de parpadear a vacío.
    placeholderData: keepPreviousData,
  });
}

/** Lotes y totales de un producto. Trae también los lotes en negativo. */
export function useProductStock(productId: number | null) {
  return useQuery({
    queryKey: inventoryKeys.product(productId ?? 0),
    enabled: productId !== null,
    queryFn: async () => {
      const { data } = await api.get<ProductStock>(`/api/inventory/products/${productId}`);
      return data;
    },
  });
}

/**
 * Libro mayor del inventario, más reciente primero. Es solo lectura: los
 * movimientos los crean las operaciones (venta, compra, ajuste), nunca
 * la interfaz.
 */
export function useStockMovements(query: MovementsQuery, enabled = true) {
  return useQuery({
    queryKey: inventoryKeys.movements(query),
    enabled,
    queryFn: async () => {
      const { data } = await api.get<Paginated<StockMovement>>("/api/stock-movements", {
        params: query,
      });
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

/**
 * Invalida todo lo que depende del stock. Además del inventario se
 * refrescan los productos: el listado del catálogo muestra el disponible
 * y quedaría mostrando el número viejo.
 */
function useInvalidarStock() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    void queryClient.invalidateQueries({ queryKey: productKeys.all });
  };
}

/**
 * Ajuste manual de stock. Requiere `stock.adjust`.
 *
 * Positivo carga, negativo descuenta. Una entrada cancela PRIMERO la
 * deuda de sobreventa si la hay, y recién el excedente crea lote nuevo.
 * Una salida descuenta por FIFO y respeta `stock.allow_negative`: sin esa
 * setting activa, pedir más de lo disponible devuelve 409.
 */
export function useCreateAdjustment() {
  const invalidar = useInvalidarStock();

  return useMutation({
    mutationFn: async (body: CreateAdjustmentBody) => {
      const { data } = await api.post<AdjustmentResult>("/api/inventory/adjustments", body);
      return data;
    },
    onSuccess: invalidar,
  });
}

/**
 * Regulariza la sobreventa: carga exactamente la deuda pendiente y deja
 * el lote de sobreventa en cero. Responde 409 si no hay deuda.
 */
export function useSettleOversold(productId: number) {
  const invalidar = useInvalidarStock();

  return useMutation({
    mutationFn: async (body: SettleOversoldBody) => {
      const { data } = await api.post<AdjustmentResult>(
        `/api/inventory/products/${productId}/settle-oversold`,
        body
      );
      return data;
    },
    onSuccess: invalidar,
  });
}

// ---------------------------------------------------------------
// Lectura de los 409 del módulo
// ---------------------------------------------------------------

function detallesDe(error: unknown): Record<string, unknown> | null {
  if (!isApiError(error)) return null;
  const details = error.response?.data?.error?.details;
  return typeof details === "object" && details !== null
    ? (details as Record<string, unknown>)
    : null;
}

/** 409 "Stock insuficiente para el ajuste": cuánto se pidió y cuánto hay. */
export function conflictoDeStock(error: unknown): StockConflict | null {
  const details = detallesDe(error);
  return details !== null && "requested" in details && "available" in details
    ? (details as unknown as StockConflict)
    : null;
}
