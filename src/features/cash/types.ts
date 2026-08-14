import type { Decimal } from "@/lib/format";

/**
 * Respuestas del módulo `cash` del backend.
 * Los importes son `Decimal` de Prisma: llegan como string.
 */

export interface OpenSessionRef {
  id: number;
  openedAt: string;
  openingAmount: Decimal;
  openedBy: { id: number; username: string };
}

/** GET /api/cash/registers */
export interface CashRegister {
  id: number;
  name: string;
  branchId: number;
  isActive: boolean;
  branch: { id: number; name: string };
  /** `null` si la caja está cerrada. */
  openSession: OpenSessionRef | null;
}

export interface CashSession {
  id: number;
  cashRegisterId: number;
  openedById: number;
  openedAt: string;
  closedAt: string | null;
  openingAmount: Decimal;
  expectedAmount: Decimal | null;
  countedAmount: Decimal | null;
  difference: Decimal | null;
  notes: string | null;
  cashRegister: { id: number; name: string; branchId: number };
  openedBy: { id: number; username: string; fullName: string };
}

/**
 * GET /api/cash/sessions/current?registerId=
 *
 * Ojo: `salesByPaymentMethod` NO trae el id del método, solo el nombre
 * (así lo arma el backend), así que sirve para mostrar, no para operar.
 */
export interface CurrentSession {
  session: CashSession;
  summary: {
    salesByPaymentMethod: Array<{
      name: string;
      affectsCash: boolean;
      total: number;
      count: number;
    }>;
    cashIn: number;
    cashOut: number;
    openingAmount: number;
    expectedCash: number;
    movementsCount: number;
  };
}

/**
 * POST /api/cash/sessions
 *
 * El campo es `cashRegisterId` (no `registerId`) y el schema del backend
 * es `.strict()`: cualquier otro nombre devuelve 400.
 */
export interface OpenSessionBody {
  cashRegisterId: number;
  openingAmount: number;
}
