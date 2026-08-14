/**
 * Une clases condicionales sin dependencias externas.
 * `cn("base", cond && "extra", undefined)` → "base extra"
 */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}
