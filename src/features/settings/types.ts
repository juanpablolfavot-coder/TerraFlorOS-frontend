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

/**
 * Datos del vivero que se imprimen en presupuestos y comprobantes.
 * `company.logo` guarda la imagen como data URL base64 (el backend
 * acepta PNG, JPG o WEBP, y `""` para quitarla).
 */
export const COMPANY_NAME = "company.name";
export const COMPANY_PHONE = "company.phone";
export const COMPANY_ADDRESS = "company.address";
export const COMPANY_LOGO = "company.logo";

/** Orden en que se muestran las claves del vivero, de lo más usado abajo. */
export const COMPANY_ORDER = [
  COMPANY_NAME,
  COMPANY_PHONE,
  COMPANY_ADDRESS,
  COMPANY_LOGO,
  "company.currency",
  "company.timezone",
] as const;

/** Datos del vivero listos para el encabezado de un comprobante. */
export interface DatosDelVivero {
  nombre: string;
  telefono: string;
  direccion: string;
  /** Data URL, o `null` si no hay logo cargado. */
  logo: string | null;
}

/** Igual que el backend: trim + minúsculas y comparación contra "true". */
export function esVerdadero(valor: string | undefined): boolean {
  return valor?.trim().toLowerCase() === "true";
}
