import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, isApiError } from "@/lib/api";
import type { CashRegister, CashSession, CurrentSession, OpenSessionBody } from "./types";

export const cashKeys = {
  all: ["cash"] as const,
  registers: ["cash", "registers"] as const,
  current: (registerId: number) => ["cash", "current", registerId] as const,
};

/**
 * Cajas de la sucursal, con su sesión abierta si la tienen.
 * Ojo: el backend exige `cash.open` también para LISTAR, así que quien no
 * tenga ese permiso recibe 403 (ver PosPage).
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
