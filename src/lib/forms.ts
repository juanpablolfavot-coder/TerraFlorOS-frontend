import type { z } from "zod";

/**
 * Helpers comunes a todos los formularios: los campos viven como string
 * en el estado del form y se convierten recién al mandar.
 */

/** Primer error de cada campo, listo para pasarle a los `<Input error>`. */
export function erroresPorCampo(error: z.ZodError): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const issue of error.issues) {
    const campo = issue.path.join(".");
    salida[campo] ??= issue.message;
  }
  return salida;
}

/** Texto del formulario → lo que espera la API (`null` si está vacío). */
export function textoAApi(valor: string | undefined): string | null {
  const limpio = (valor ?? "").trim();
  return limpio === "" ? null : limpio;
}

/** Número del formulario → number o `null`. Acepta coma decimal. */
export function numeroAApi(valor: string | undefined): number | null {
  const limpio = (valor ?? "").trim();
  if (limpio === "") return null;
  const n = Number(limpio.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
