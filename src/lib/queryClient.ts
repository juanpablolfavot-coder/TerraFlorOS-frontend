import { QueryClient } from "@tanstack/react-query";
import { isApiError } from "./api";

/**
 * Un 4xx no se reintenta: si el backend dijo "no tenés permiso" o "no
 * existe", insistir solo suma ruido. Los errores de red sí se reintentan.
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;

  if (isApiError(error)) {
    const status = error.response?.status;
    if (status !== undefined && status >= 400 && status < 500) return false;
  }
  return true;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      // Datos de ERP: frescos por medio minuto, alcanza para no
      // bombardear el backend al navegar entre pantallas.
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
