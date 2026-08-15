/**
 * Formato de números, dinero y fechas. Todo en es-AR.
 *
 * OJO con los decimales: Prisma serializa sus `Decimal` como STRING en el
 * JSON (precios, costos, stock). Por eso `toNumber` acepta string y nunca
 * se debe hacer aritmética directa sobre esos campos.
 */

const LOCALE = "es-AR";
const CURRENCY = "ARS";
const TIME_ZONE = "America/Argentina/Cordoba";

const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: TIME_ZONE,
});

const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

/** Decimal de Prisma tal como llega en el JSON. */
export type Decimal = string | number;

export function toNumber(value: Decimal | null | undefined, fallback = 0): number {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function formatMoney(value: Decimal | null | undefined): string {
  return currencyFormatter.format(toNumber(value));
}

/** Cantidades de stock: sin decimales si es entero, hasta 2 si no. */
export function formatQuantity(value: Decimal | null | undefined): string {
  const quantity = toNumber(value);
  return quantity.toLocaleString(LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: Number.isInteger(quantity) ? 0 : 2,
  });
}

export function formatNumber(value: Decimal | null | undefined): string {
  return toNumber(value).toLocaleString(LOCALE);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormatter.format(date);
}

/**
 * Cantidad con su unidad, pluralizando el nombre: 1 unidad, 12 unidades,
 * 3 bolsas. Las abreviaturas (kg, m2) se dejan como están.
 */
export function formatQuantityWithUnit(value: Decimal | null | undefined, unit: string): string {
  const cantidad = toNumber(value);
  const nombre =
    cantidad === 1
      ? unit
      : /[aeiouáéíóú]$/i.test(unit)
        ? `${unit}s`
        : /[a-zñáéíóú]{3,}$/i.test(unit)
          ? `${unit}es`
          : unit;
  return `${formatQuantity(cantidad)} ${nombre}`;
}

/** `YYYY-MM-DD`, el formato que esperan los inputs date y los filtros. */
export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}
