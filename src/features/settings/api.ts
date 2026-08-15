import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  ALLOW_NEGATIVE,
  COMPANY_ADDRESS,
  COMPANY_LOGO,
  COMPANY_NAME,
  COMPANY_PHONE,
  esVerdadero,
  type DatosDelVivero,
  type PatchSettingsBody,
  type Setting,
} from "./types";

const NOMBRE_POR_DEFECTO = import.meta.env.VITE_APP_NAME ?? "TerraFlorOS";

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
 * Datos del vivero para el encabezado de los comprobantes.
 *
 * Las claves pueden no existir en una base vieja (el seed las agregó
 * después), así que todo cae a un valor razonable: sin nombre se usa el
 * de la app, y sin logo el encabezado se muestra solo con texto.
 * `cargando` sirve para no imprimir antes de tener el logo.
 */
export function useDatosDelVivero(): { datos: DatosDelVivero; cargando: boolean } {
  const settings = useSettings();
  const valor = (key: string) => settings.data?.find((s) => s.key === key)?.value.trim() ?? "";
  const logo = valor(COMPANY_LOGO);

  return {
    datos: {
      nombre: valor(COMPANY_NAME) || NOMBRE_POR_DEFECTO,
      telefono: valor(COMPANY_PHONE),
      direccion: valor(COMPANY_ADDRESS),
      logo: logo === "" ? null : logo,
    },
    cargando: settings.isPending,
  };
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
