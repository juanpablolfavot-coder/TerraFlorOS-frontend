/**
 * Respuestas del módulo dashboard del backend.
 *
 * Los campos de costo (`cmv`, `margin`, `inventoryValueAtCost`, …) SOLO
 * llegan si el usuario tiene `products.view_cost`. Por eso son opcionales:
 * la interfaz tiene que sobrevivir sin ellos.
 */

/** GET /api/dashboard/today */
export interface DashboardToday {
  branchId: number | null;
  timezone: string;
  from: string;
  to: string;
  sales: {
    revenue: number;
    tickets: number;
    units: number;
    averageTicket: number;
    cmv?: number;
    margin?: number;
  };
  paymentsByMethod: Array<{
    paymentMethodId: number;
    name: string;
    affectsCash: boolean;
    total: number;
    count: number;
  }>;
  cashExpenses: { total: number; count: number };
}

/** GET /api/dashboard/stock */
export interface DashboardStock {
  branchId: number | null;
  counts: {
    totalProducts: number;
    outOfStock: number;
    critical: number;
    excess: number;
  };
  inventoryValueAtCost?: number;
  batchesWithStock?: number;
  criticalProducts: Array<{
    id: number;
    sku: string;
    name: string;
    available: number;
    minStock: number;
  }>;
  outOfStockProducts: Array<{ id: number; sku: string; name: string }>;
}

/** GET /api/dashboard/plants */
export interface DashboardPlants {
  branchId: number | null;
  timezone: string;
  liveStock: number;
  plantProductsWithStock: number;
  quarantine: { batches: number; quantity: number };
  lossesThisMonth: {
    since: string;
    units: number;
    count: number;
    cost?: number;
  };
}
