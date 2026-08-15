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
    /**
     * Vuelto entregado en el turno. Existe porque `salesByPaymentMethod`
     * muestra el BRUTO que entregó el cliente, mientras que `expectedCash`
     * sale de los movimientos de caja, que son netos: el vuelto es
     * exactamente la diferencia entre los dos.
     */
    changeGiven: number;
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

/** Tipos que puede tener un movimiento ya registrado. */
export type CashMovementType =
  | ManualMovementType
  | "SALE_CASH"
  | "REFUND"
  | "ADJUSTMENT";

/**
 * Movimiento devuelto por el backend (201).
 * `amount` viene CON SIGNO: DEPOSIT entra positivo, EXPENSE y WITHDRAWAL
 * negativos. El monto que se manda, en cambio, es siempre positivo.
 */
export interface CashMovement {
  id: number;
  cashSessionId: number;
  type: CashMovementType;
  amount: Decimal;
  description: string | null;
  userId: number;
  createdAt: string;
}

/**
 * GET /api/cash/sessions/:id/movements
 *
 * Todos los movimientos del turno, en orden cronológico y sin paginar.
 * Incluye los automáticos (`SALE_CASH` de las ventas en efectivo), no
 * solo los cargados a mano, y los de cualquier usuario del turno.
 */
export interface SessionMovement {
  id: number;
  type: CashMovementType;
  amount: Decimal;
  description: string | null;
  refType: string | null;
  refId: number | null;
  userId: number;
  user: { id: number; username: string; fullName: string } | null;
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

// ---------------------------------------------------------------
// Historial de cajas
// ---------------------------------------------------------------

/**
 * Fila de `GET /api/cash/sessions`.
 *
 * Leerlo pide `cash.close` **o** `reports.view`: el cajero tiene que
 * poder revisar sus propios arqueos, y el rol Cajero del seed no tiene
 * `reports.view`.
 */
export interface SessionListItem {
  id: number;
  cashRegisterId: number;
  openedById: number;
  closedById: number | null;
  openedAt: string;
  closedAt: string | null;
  openingAmount: Decimal;
  /** Los tres del arqueo son `null` mientras la caja siga abierta. */
  expectedAmount: Decimal | null;
  countedAmount: Decimal | null;
  difference: Decimal | null;
  notes: string | null;
  cashRegister: { id: number; name: string; branchId: number };
  openedBy: { id: number; username: string; fullName: string };
  /** `closedById` no tiene relación en Prisma: el backend lo resuelve aparte. */
  closedBy: { id: number; username: string; fullName: string } | null;
  isOpen: boolean;
  /** Ventas COMPLETED del turno. Llegan como number, ya sumadas. */
  sales: { total: number; count: number };
}

/** Venta del turno, tal como la trae el detalle de la sesión. */
export interface SessionSale {
  id: number;
  number: string;
  total: Decimal;
  changeGiven: Decimal;
  status: "COMPLETED" | "VOIDED";
  createdAt: string;
  customer: { id: number; name: string } | null;
}

/**
 * `GET /api/cash/sessions/:id`, para una sesión abierta o cerrada.
 *
 * `summary` es el mismo que devuelve `/sessions/current`, así que el
 * desglose por método de pago es AGREGADO del turno: el backend no
 * expone con qué método se pagó cada venta.
 *
 * OJO con `session`: acá **no** viene el agregado `sales` que sí trae
 * cada fila del LISTADO. Las ventas del turno llegan aparte, en el array
 * `sales` (que incluye las anuladas), y los totales de caja en `summary`.
 * De ahí el `Omit`: sin él, el tipo prometía un campo que el backend
 * nunca manda.
 */
export interface SessionDetail {
  session: Omit<SessionListItem, "sales">;
  summary: CurrentSession["summary"];
  movements: SessionMovement[];
  sales: SessionSale[];
}

export interface SessionsQuery {
  page?: number;
  pageSize?: number;
  registerId?: number;
  status?: "open" | "closed";
  openedById?: number;
  closedById?: number;
  dateFrom?: string;
  dateTo?: string;
}
