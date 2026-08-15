import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, isApiError } from "@/lib/api";
import type { Paginated } from "@/features/products/types";
import type {
  CashMovement,
  CashRegister,
  CashSession,
  ClosedSession,
  CloseSessionBody,
  CreateMovementBody,
  CurrentSession,
  OpenSessionBody,
  SessionDetail,
  SessionListItem,
  SessionMovement,
  SessionsQuery,
} from "./types";

export const cashKeys = {
  all: ["cash"] as const,
  registers: ["cash", "registers"] as const,
  current: (registerId: number) => ["cash", "current", registerId] as const,
  movements: (sessionId: number) => ["cash", "movements", sessionId] as const,
  history: (query: SessionsQuery) => ["cash", "history", query] as const,
  session: (sessionId: number) => ["cash", "session", sessionId] as const,
};

/**
 * Cajas de la sucursal, con su sesión abierta si la tienen.
 * Leer requiere `sales.create` O `cash.open`: un vendedor necesita saber
 * si hay caja abierta para poder facturar.
 */
export function useRegisters(enabled = true) {
  return useQuery({
    queryKey: cashKeys.registers,
    queryFn: async () => {
      const { data } = await api.get<CashRegister[]>("/api/cash/registers");
      return data;
    },
    enabled,
  });
}

/**
 * Sesión abierta de una caja, con el resumen en vivo.
 * El backend responde 404 cuando la caja no tiene sesión abierta: eso no
 * es un error, es "caja cerrada", así que se traduce a `null`.
 */
export function useCurrentSession(registerId: number | null) {
  return useQuery({
    queryKey: cashKeys.current(registerId ?? 0),
    enabled: registerId !== null,
    queryFn: async () => {
      try {
        const { data } = await api.get<CurrentSession>("/api/cash/sessions/current", {
          params: { registerId },
        });
        return data;
      } catch (error) {
        if (isApiError(error) && error.response?.status === 404) return null;
        throw error;
      }
    },
  });
}

/** Apertura de caja. 409 si esa caja ya tiene una sesión abierta. */
export function useOpenSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: OpenSessionBody) => {
      const { data } = await api.post<CashSession>("/api/cash/sessions", body);
      return data;
    },
    onSuccess: () => {
      // Cambió el estado de las cajas: que el POS lo vea enseguida
      void queryClient.invalidateQueries({ queryKey: cashKeys.all });
    },
  });
}

/**
 * Movimientos del turno, completos y en orden cronológico. Leer requiere
 * `sales.create` o `cash.open`, igual que el resto de las lecturas de caja.
 */
export function useSessionMovements(sessionId: number | null) {
  return useQuery({
    queryKey: cashKeys.movements(sessionId ?? 0),
    enabled: sessionId !== null,
    queryFn: async () => {
      const { data } = await api.get<SessionMovement[]>(
        `/api/cash/sessions/${sessionId}/movements`
      );
      return data;
    },
  });
}

/**
 * Historial de cajas, más reciente primero. Incluye las abiertas.
 * Leerlo pide `cash.close` o `reports.view` — no alcanza con las
 * lecturas del turno en curso.
 */
export function useSessionHistory(query: SessionsQuery) {
  return useQuery({
    queryKey: cashKeys.history(query),
    queryFn: async () => {
      const { data } = await api.get<Paginated<SessionListItem>>("/api/cash/sessions", {
        params: query,
      });
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

/** Detalle de una sesión, esté abierta o cerrada. */
export function useSessionDetail(sessionId: number | null) {
  return useQuery({
    queryKey: cashKeys.session(sessionId ?? 0),
    enabled: sessionId !== null,
    queryFn: async () => {
      const { data } = await api.get<SessionDetail>(`/api/cash/sessions/${sessionId}`);
      return data;
    },
  });
}

/**
 * Movimiento manual de efectivo (gasto, retiro o depósito).
 * Solo sobre una sesión abierta: el backend responde 409 si está cerrada.
 */
export function useAddMovement(sessionId: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreateMovementBody) => {
      if (sessionId === null) throw new Error("No hay una sesión de caja abierta");
      const { data } = await api.post<CashMovement>(
        `/api/cash/sessions/${sessionId}/movements`,
        body
      );
      return data;
    },
    onSuccess: () => {
      // El movimiento cambia el efectivo esperado del turno
      void queryClient.invalidateQueries({ queryKey: cashKeys.all });
    },
  });
}

/**
 * Cierre con arqueo. El backend calcula `expectedAmount` y `difference`
 * a partir del `countedAmount` declarado. Una sesión cerrada es
 * inmutable: reintentar el cierre devuelve 409.
 */
export function useCloseSession(sessionId: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CloseSessionBody) => {
      if (sessionId === null) throw new Error("No hay una sesión de caja abierta");
      const { data } = await api.post<ClosedSession>(
        `/api/cash/sessions/${sessionId}/close`,
        body
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cashKeys.all });
    },
  });
}
