import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ALLOW_NEGATIVE, esVerdadero, type PatchSettingsBody, type Setting } from "./types";

export const settingsKeys = {
  all: ["settings"] as const,
};

/**
 * Configuración del sistema.
 *
 * Leerla acepta `sales.create` **o** `settings.manage`: el POS necesita
 * saber si se puede vender sin stock, y la configuración no tiene
 * secretos. Escribir sigue exigiendo `settings.manage`.
 */
export function useSettings(enabled = true) {
  return useQuery({
    queryKey: settingsKeys.all,
    queryFn: async () => {
      const { data } = await api.get<Setting[]>("/api/settings");
      return data;
    },
    enabled,
    // Cambia poco, pero cuando cambia importa: no se cachea de más
    staleTime: 60_000,
  });
}

/**
 * ¿Está activo el permiso de vender sin stock?
 *
 * Se resuelve con el mismo criterio que el backend (trim + minúsculas).
 * Ante un error o mientras carga devuelve `false`: si no se sabe, se
 * asume el comportamiento estricto de siempre.
 */
export function usePermiteStockNegativo(enabled = true): boolean {
  const settings = useSettings(enabled);
  return esVerdadero(settings.data?.find((s) => s.key === ALLOW_NEGATIVE)?.value);
}

/**
 * Actualiza una o varias claves. El backend NO crea claves nuevas: si
 * llega una desconocida responde 400 con la lista.
 */
export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: PatchSettingsBody) => {
      const { data } = await api.patch<Setting[]>("/api/settings", body);
      return data;
    },
    onSuccess: (settings) => {
      // La respuesta ya trae la lista completa actualizada
      queryClient.setQueryData(settingsKeys.all, settings);
    },
  });
}
