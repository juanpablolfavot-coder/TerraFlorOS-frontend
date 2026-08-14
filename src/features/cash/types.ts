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
 * `registerId`, igual que el resto de los endpoints de caja. El schema
 * del backend es `.strict()`, así que el nombre viejo (`cashRegisterId`)
 * ahora devuelve 400.
 */
export interface OpenSessionBody {
  registerId: number;
  openingAmount: number;
}

// ---------------------------------------------------------------
// Movimientos manuales
// ---------------------------------------------------------------

/**
 * Tipos que el usuario puede registrar a mano. El enum del backend tiene
 * además SALE_CASH, REFUND y ADJUSTMENT, que los crea solo el sistema.
 */
export type ManualMovementType = "EXPENSE" | "WITHDRAWAL" | "DEPOSIT";

/** POST /api/cash/sessions/:id/movements — el schema es `.strict()`. */
export interface CreateMovementBody {
  type: ManualMovementType;
  amount: number;
  description: string;
}

/**
 * Movimiento devuelto por el backend (201).
 * `amount` viene CON SIGNO: DEPOSIT entra positivo, EXPENSE y WITHDRAWAL
 * negativos. El monto que se manda, en cambio, es siempre positivo.
 */
export interface CashMovement {
  id: number;
  cashSessionId: number;
  type: ManualMovementType | "SALE_CASH" | "REFUND" | "ADJUSTMENT";
  amount: Decimal;
  description: string | null;
  userId: number;
  createdAt: string;
}

// ---------------------------------------------------------------
// Cierre con arqueo
// ---------------------------------------------------------------

/** POST /api/cash/sessions/:id/close — `.strict()`. */
export interface CloseSessionBody {
  countedAmount: number;
  notes?: string | null;
}

/** Sesión ya cerrada: los tres importes del arqueo dejan de ser null. */
export interface ClosedSession extends Omit<CashSession, "openedBy"> {
  closedAt: string;
  expectedAmount: Decimal;
  countedAmount: Decimal;
  difference: Decimal;
}
