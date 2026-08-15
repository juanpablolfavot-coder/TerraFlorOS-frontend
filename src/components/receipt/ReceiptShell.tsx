import { useEffect, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { accionDeComprobante, imprimirDocumento } from "@/lib/print";

const NOMBRE = import.meta.env.VITE_APP_NAME ?? "TerraFlorOS";

/**
 * Barra de acciones del comprobante. `print:hidden`: en el papel no van
 * los botones, va el documento.
 */
export function ReceiptActions({ archivo }: { archivo: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
      <p className="max-w-sm text-sm text-stone-500">
        Vista para imprimir o mostrarle al cliente. «Descargar PDF» abre el diálogo de impresión:
        elegí «Guardar como PDF» como destino.
      </p>
      <div className="flex items-center gap-3">
        <Button onClick={() => imprimirDocumento()}>Imprimir</Button>
        <Button variant="secondary" onClick={() => imprimirDocumento(archivo)}>
          Descargar PDF
        </Button>
        <button
          type="button"
          onClick={() => window.close()}
          className="text-sm font-medium text-stone-500 hover:text-stone-800"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

/**
 * Hoja del comprobante: la misma para el presupuesto y para la venta.
 *
 * Va fuera del layout de la app (sin menú ni barra lateral) y solo
 * muestra datos que el cliente puede ver. Nada de costos, márgenes ni de
 * qué lista de precios salió: eso es interno.
 */
export function ReceiptShell({
  tipo,
  numero,
  fecha,
  sucursal,
  archivo,
  children,
}: {
  /** "Presupuesto", "Comprobante de venta"… */
  tipo: string;
  numero: string;
  fecha: string;
  sucursal: string;
  /** Nombre del archivo al guardar como PDF. */
  archivo: string;
  children: ReactNode;
}) {
  const [params] = useSearchParams();
  const accion = accionDeComprobante(params.get("accion"));

  /**
   * El detalle abre esta vista con `?accion=`, así "Imprimir" desde la
   * venta imprime de una y no deja al usuario frente a otra pantalla.
   * Se dispara una sola vez, cuando el documento ya está en pantalla.
   */
  useEffect(() => {
    if (accion === null) return;
    const id = window.setTimeout(
      () => imprimirDocumento(accion === "pdf" ? archivo : undefined),
      150
    );
    return () => window.clearTimeout(id);
  }, [accion, archivo]);

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl space-y-10 px-8 py-10">
        <ReceiptActions archivo={archivo} />

        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-stone-200 pb-8">
          <div className="space-y-1">
            <p className="text-2xl font-semibold tracking-tight text-stone-900">{NOMBRE}</p>
            <p className="text-sm text-stone-500">{sucursal}</p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-sm tracking-wide text-stone-500 uppercase">{tipo}</p>
            <p className="font-mono text-lg text-stone-900">{numero}</p>
            <p className="text-sm text-stone-500">Fecha: {formatDate(fecha)}</p>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
