import type { PaymentLine, PaymentMethod } from "./types";

/**
 * Reglas de pago del POS, espejadas del backend (`sales.service.ts`).
 *
 * El backend valida, en este orden:
 *  1. la suma de los pagos NO efectivos no puede superar el total
 *     (tarjeta y transferencia no dan vuelto),
 *  2. la suma total tiene que cubrir el total de la venta,
 *  3. el vuelto (suma − total) no puede superar el efectivo recibido.
 *
 * Se replica acá para habilitar el botón de cobrar con el mismo criterio y
 * explicar el bloqueo antes de mandar la request, no para reemplazar la
 * validación: la que manda es la del servidor.
 */

/** Misma tolerancia que el backend, para no pelearse con los decimales. */
export const PAYMENT_EPSILON = 0.004;

const round2 = (valor: number) => Math.round(valor * 100) / 100;

/** Texto del campo de monto → number. Acepta coma decimal. */
export function montoDe(texto: string): number {
  const limpio = texto.trim().replace(",", ".");
  if (limpio === "") return 0;
  const n = Number(limpio);
  return Number.isFinite(n) && n > 0 ? round2(n) : 0;
}

/** Number → texto del campo, con coma decimal. */
export function montoATexto(valor: number): string {
  return valor <= 0 ? "" : String(round2(valor)).replace(".", ",");
}

export interface PaymentTotals {
  /** Suma de los pagos con método elegido. */
  pagado: number;
  efectivo: number;
  electronico: number;
  /** Lo que falta para cubrir el total (0 si ya está cubierto). */
  falta: number;
  /** Exceso a devolver. Solo puede salir del efectivo. */
  vuelto: number;
  /** Los pagos electrónicos superan el total: el backend lo rechaza. */
  excesoElectronico: boolean;
  /** El vuelto no está respaldado por efectivo recibido. */
  vueltoSinRespaldo: boolean;
  /** Hay un pago cargado sin método elegido. */
  faltaMetodo: boolean;
  /** Los pagos son válidos para el backend. */
  ok: boolean;
}

/**
 * Estado del cobro. Los pagos sin método NO entran en las sumas: contarlos
 * mostraría un vuelto que el backend no va a aceptar.
 */
export function calcularPagos(
  payments: PaymentLine[],
  methods: PaymentMethod[],
  total: number
): PaymentTotals {
  const metodoDe = (id: number | null) =>
    id === null ? undefined : methods.find((metodo) => metodo.id === id);

  let efectivo = 0;
  let electronico = 0;
  let faltaMetodo = false;
  let montoInvalido = false;

  for (const pago of payments) {
    const monto = montoDe(pago.amount);
    const metodo = metodoDe(pago.paymentMethodId);

    if (metodo === undefined) {
      // Un renglón vacío todavía no es un error: recién lo es si tiene monto
      if (monto > 0) faltaMetodo = true;
      else montoInvalido = true;
      continue;
    }
    if (monto <= 0) {
      montoInvalido = true;
      continue;
    }

    if (metodo.affectsCash) efectivo = round2(efectivo + monto);
    else electronico = round2(electronico + monto);
  }

  const pagado = round2(efectivo + electronico);
  const excesoElectronico = electronico > total + PAYMENT_EPSILON;
  const cubre = pagado >= total - PAYMENT_EPSILON;
  const vuelto = round2(Math.max(0, pagado - total));
  const vueltoSinRespaldo = vuelto > efectivo + PAYMENT_EPSILON;

  return {
    pagado,
    efectivo,
    electronico,
    falta: round2(Math.max(0, total - pagado)),
    vuelto,
    excesoElectronico,
    vueltoSinRespaldo,
    faltaMetodo,
    ok:
      payments.length > 0 &&
      !montoInvalido &&
      !faltaMetodo &&
      !excesoElectronico &&
      !vueltoSinRespaldo &&
      cubre,
  };
}

/** Escalones para redondear hacia arriba lo que el cliente suele entregar. */
const ESCALONES = [500, 1000, 2000, 5000, 10000];

/**
 * Montos sugeridos para una línea en efectivo: lo justo y los billetes
 * redondos que siguen. Sirve para el caso más común del mostrador —
 * cobrar $2.500 con $3.000 y dar vuelto.
 */
export function sugerenciasDeEfectivo(falta: number): number[] {
  if (falta <= 0) return [];

  const redondeos = ESCALONES.map((paso) => Math.ceil(falta / paso) * paso).filter(
    (monto) => monto > falta + PAYMENT_EPSILON
  );

  // Dos alcanzan: con "Justo" son tres botones y entran en una línea
  return [...new Set(redondeos)].slice(0, 2);
}
