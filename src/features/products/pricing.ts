/**
 * Cálculo margen ↔ precio del catálogo.
 *
 * La fórmula es MARGEN SOBRE COSTO (remarcación):
 *
 *     precio = costo × (1 + margen/100)
 *     margen = (precio/costo − 1) × 100
 *
 * Se eligió sobre costo — y no sobre venta — porque es como se piensa al
 * remarcar en el mostrador: «el costo más un 60 %». Sin un costo mayor a
 * cero el margen no se puede calcular: el precio se carga directo.
 *
 * El precio calculado respeta la setting `pricing.rounding` (redondeo al
 * múltiplo indicado; 0 = solo dos decimales, coherente con «$ 0,00»).
 */

const round2 = (valor: number) => Math.round(valor * 100) / 100;

/** Texto de un input (acepta coma decimal) → number, o `null` si vacío/inválido. */
export function numeroDe(texto: string): number | null {
  const limpio = texto.trim();
  if (limpio === "") return null;
  const n = Number(limpio.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** number → texto de input, con coma decimal y hasta dos decimales. */
export function aTexto(valor: number): string {
  return String(round2(valor)).replace(".", ",");
}

/** Redondea un precio al múltiplo de `pricing.rounding`; sin múltiplo, a 2 decimales. */
export function redondearPrecio(valor: number, multiplo: number): number {
  return multiplo > 0 ? Math.round(valor / multiplo) * multiplo : round2(valor);
}

export function precioDesdeMargen(costo: number, margenPct: number): number | null {
  if (costo <= 0) return null;
  return costo * (1 + margenPct / 100);
}

export function margenDesdePrecio(costo: number, precio: number): number | null {
  if (costo <= 0 || precio <= 0) return null;
  return (precio / costo - 1) * 100;
}

/**
 * Estado de una fila margen ↔ precio. Los dos campos viven como TEXTO
 * tal cual se tipean (coma decimal incluida): guardarlos como number
 * comía los decimales a medio escribir. `fijado` recuerda cuál de los
 * dos escribió el usuario; el otro es el calculado.
 */
export interface FilaPrecio {
  margen: string;
  precio: string;
  fijado: "margen" | "precio" | null;
}

export const FILA_VACIA: FilaPrecio = { margen: "", precio: "", fijado: null };

/** El usuario escribió el MARGEN: se recalcula el precio (si hay costo). */
export function filaConMargen(
  fila: FilaPrecio,
  margen: string,
  costo: number | null,
  redondeo: number
): FilaPrecio {
  const pct = numeroDe(margen);
  const precio =
    pct !== null && costo !== null && costo > 0
      ? aTexto(redondearPrecio(costo * (1 + pct / 100), redondeo))
      : fila.precio;
  return { margen, precio, fijado: "margen" };
}

/** El usuario escribió el PRECIO: se recalcula el margen que resulta. */
export function filaConPrecio(precio: string, costo: number | null): FilaPrecio {
  const n = numeroDe(precio);
  const pct = n !== null && costo !== null && costo > 0 ? margenDesdePrecio(costo, n) : null;
  return { margen: pct === null ? "" : aTexto(pct), precio, fijado: "precio" };
}

/**
 * Cambió el COSTO: cada fila recalcula su campo derivado respetando el
 * que el usuario fijó (margen fijo → precio nuevo; precio fijo → margen
 * nuevo). Las filas sin tocar quedan como están.
 */
export function recalcularFilas(
  filas: Record<number, FilaPrecio>,
  costo: number | null,
  redondeo: number
): Record<number, FilaPrecio> {
  const salida: Record<number, FilaPrecio> = {};
  for (const [id, fila] of Object.entries(filas)) {
    if (fila.fijado === "margen") {
      salida[Number(id)] = filaConMargen(fila, fila.margen, costo, redondeo);
    } else if (fila.fijado === "precio") {
      salida[Number(id)] = filaConPrecio(fila.precio, costo);
    } else {
      salida[Number(id)] = fila;
    }
  }
  return salida;
}
