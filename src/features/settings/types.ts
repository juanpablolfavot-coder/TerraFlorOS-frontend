/**
 * Configuración del sistema (`/api/settings`).
 *
 * Los valores viajan SIEMPRE como string, incluso los booleanos y los
 * números: el backend los interpreta según la clave.
 */
export interface Setting {
  key: string;
  value: string;
  description: string | null;
  updatedAt: string;
}

/** PATCH /api/settings — el body es un ARRAY pelado, no un objeto. */
export type PatchSettingsBody = Array<{ key: string; value: string }>;

/** Claves que el backend valida como booleanas (solo "true"/"false"). */
export const BOOLEAN_KEYS = ["stock.allow_negative"] as const;

/** Claves que el backend valida como números no negativos. */
export const NUMERIC_KEYS = ["pricing.rounding", "purchases.cost_increase_alert_pct"] as const;

export const ALLOW_NEGATIVE = "stock.allow_negative";

/** Igual que el backend: trim + minúsculas y comparación contra "true". */
export function esVerdadero(valor: string | undefined): boolean {
  return valor?.trim().toLowerCase() === "true";
}
