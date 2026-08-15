/**
 * Impresión y "descarga en PDF" de los comprobantes.
 *
 * No hay librería de PDF y no hace falta: el diálogo de impresión del
 * navegador ya genera PDF ("Guardar como PDF" / "Microsoft Print to
 * PDF"), respeta las reglas `print:` de la hoja de estilos y usa el
 * TÍTULO del documento como nombre del archivo. Meter un generador
 * propio al bundle para hacer peor lo mismo no se justifica.
 *
 * Por eso "Descargar PDF" es imprimir con el título cambiado: el archivo
 * sale como `Venta 0001-00000007.pdf` en vez de `localhost`.
 */

/**
 * Abre el diálogo de impresión. Si se pasa un nombre, lo deja como
 * título del documento mientras dura la impresión y lo restaura después
 * (por `afterprint`, y por las dudas también con un temporizador: hay
 * navegadores que no disparan el evento si se cancela).
 */
export function imprimirDocumento(nombreDeArchivo?: string): void {
  if (nombreDeArchivo === undefined || nombreDeArchivo.trim() === "") {
    window.print();
    return;
  }

  const anterior = document.title;
  let restaurado = false;
  const restaurar = () => {
    if (restaurado) return;
    restaurado = true;
    document.title = anterior;
    window.removeEventListener("afterprint", restaurar);
  };

  document.title = nombreDeArchivo;
  window.addEventListener("afterprint", restaurar);
  window.print();
  window.setTimeout(restaurar, 3000);
}

/**
 * Acción pedida por la pantalla que abrió el comprobante
 * (`?accion=imprimir` o `?accion=pdf`), para que los botones del detalle
 * de una venta hagan algo de una en vez de dejar al usuario frente a
 * otra pantalla con más botones.
 */
export type AccionDeComprobante = "imprimir" | "pdf";

export function accionDeComprobante(valor: string | null): AccionDeComprobante | null {
  return valor === "imprimir" || valor === "pdf" ? valor : null;
}
