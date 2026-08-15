import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui";
import { useDatosDelVivero } from "@/features/settings/api";
import { formatDate } from "@/lib/format";
import { accionDeComprobante, imprimirDocumento } from "@/lib/print";

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
 * Va fuera del layout de la app (sin menú ni barra lateral) y el
 * encabezado sale de los datos del vivero cargados en Configuración
 * (nombre, teléfono, dirección y logo). Sin logo se ve prolijo igual,
 * solo con texto.
 *
 * Solo muestra datos que el cliente puede ver: nada de costos, márgenes
 * ni de qué lista de precios salió.
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
  const { datos, cargando } = useDatosDelVivero();

  /**
   * Imprimir antes de que cargue el logo saldría sin logo, así que se
   * espera a tener la configuración y, si hay imagen, a que termine de
   * cargar. Un error al cargarla también libera la impresión: mejor un
   * comprobante sin logo que uno que nunca sale.
   */
  const [logoListo, setLogoListo] = useState(false);
  const listoParaImprimir = !cargando && (datos.logo === null || logoListo);

  /**
   * El detalle abre esta vista con `?accion=`, así "Imprimir" desde la
   * venta imprime de una y no deja al usuario frente a otra pantalla.
   */
  useEffect(() => {
    if (accion === null || !listoParaImprimir) return;
    const id = window.setTimeout(
      () => imprimirDocumento(accion === "pdf" ? archivo : undefined),
      150
    );
    return () => window.clearTimeout(id);
  }, [accion, archivo, listoParaImprimir]);

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl space-y-10 px-8 py-10">
        <ReceiptActions archivo={archivo} />

        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-stone-200 pb-8">
          <div className="flex items-start gap-4">
            {datos.logo !== null && (
              <img
                src={datos.logo}
                alt={`Logo de ${datos.nombre}`}
                onLoad={() => setLogoListo(true)}
                onError={() => setLogoListo(true)}
                className="h-16 w-auto max-w-40 object-contain"
              />
            )}
            <div className="space-y-1">
              <p className="text-2xl font-semibold tracking-tight text-stone-900">{datos.nombre}</p>
              <p className="text-sm text-stone-500">{sucursal}</p>
              {datos.direccion !== "" && (
                <p className="text-sm text-stone-500">{datos.direccion}</p>
              )}
              {datos.telefono !== "" && (
                <p className="text-sm text-stone-500">Tel. {datos.telefono}</p>
              )}
            </div>
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
