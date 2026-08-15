import { useParams } from "react-router-dom";
import { Alert, LoadingBlock } from "@/components/ui";
import { ReceiptShell } from "@/components/receipt/ReceiptShell";
import { getApiErrorMessage } from "@/lib/api";
import { formatDateTime, formatMoney, formatQuantityWithUnit, toNumber } from "@/lib/format";
import { useDocumentTitle } from "@/lib/hooks";
import { useSale } from "./api";

/**
 * Comprobante de una venta, para imprimir o guardar en PDF. Sirve tanto
 * al terminar de cobrar como para reimprimir una venta de la semana
 * pasada: sale de `GET /api/sales/:id`, así que muestra lo que quedó
 * registrado (incluido el vuelto entregado).
 *
 * Es el documento del cliente: no lleva costos, márgenes ni el nombre de
 * la lista de precios con la que se facturó.
 */
export function SalePrintPage() {
  const { id } = useParams<{ id: string }>();
  const venta = useSale(Number(id));

  useDocumentTitle(venta.data === undefined ? "Comprobante" : `Venta ${venta.data.number}`);

  if (venta.isPending) return <LoadingBlock label="Cargando el comprobante…" />;

  if (venta.error !== null || venta.data === undefined) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <Alert tone="danger" title="No se pudo cargar la venta">
          {getApiErrorMessage(venta.error)}
        </Alert>
      </div>
    );
  }

  const v = venta.data;
  const anulada = v.status === "VOIDED";
  const vuelto = toNumber(v.changeGiven);
  const entregado = v.payments.reduce((suma, pago) => suma + toNumber(pago.amount), 0);

  return (
    <ReceiptShell
      tipo="Comprobante de venta"
      numero={v.number}
      fecha={v.createdAt}
      sucursal={v.branch.name}
      archivo={`Venta ${v.number}`}
    >
      {anulada && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          VENTA ANULADA{v.voidReason !== null ? ` · ${v.voidReason}` : ""}
        </p>
      )}

      <section className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-1">
          <p className="text-sm text-stone-500">Cliente</p>
          <p className="text-stone-900">{v.customer?.name ?? "Consumidor final"}</p>
        </div>
        <div className="space-y-1 sm:text-right">
          <p className="text-sm text-stone-500">Fecha y hora</p>
          <p className="text-stone-900">{formatDateTime(v.createdAt)}</p>
        </div>
      </section>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-300 text-left text-xs tracking-wide text-stone-500 uppercase">
            <th className="pb-2 font-medium">Producto</th>
            <th className="pb-2 text-right font-medium">Cant.</th>
            <th className="pb-2 text-right font-medium">Precio</th>
            <th className="pb-2 text-right font-medium">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {v.items.map((item) => (
            <tr key={item.id} className="border-b border-stone-100">
              <td className="py-3">
                <span className="text-stone-900">{item.product.name}</span>
                <span className="block font-mono text-xs text-stone-500">{item.product.sku}</span>
              </td>
              <td className="tabular py-3 text-right text-stone-700">
                {formatQuantityWithUnit(item.quantity, item.product.unit)}
              </td>
              <td className="tabular py-3 text-right text-stone-700">
                {formatMoney(item.unitPrice)}
                {toNumber(item.discount) > 0 && (
                  <span className="block text-xs text-stone-500">
                    − {formatMoney(item.discount)} de descuento
                  </span>
                )}
              </td>
              <td className="tabular py-3 text-right font-medium text-stone-900">
                {formatMoney(item.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="space-y-2 border-t-2 border-stone-300 pt-5">
        {toNumber(v.discount) > 0 && (
          <div className="flex items-center justify-between gap-4 text-sm text-stone-500">
            <span>Subtotal</span>
            <span className="tabular">{formatMoney(v.subtotal)}</span>
          </div>
        )}
        {toNumber(v.discount) > 0 && (
          <div className="flex items-center justify-between gap-4 text-sm text-stone-500">
            <span>Descuentos</span>
            <span className="tabular">− {formatMoney(v.discount)}</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-4">
          <span className="font-medium text-stone-700">Total</span>
          <span className="tabular text-3xl font-semibold text-stone-900">
            {formatMoney(v.total)}
          </span>
        </div>
      </div>

      <section className="space-y-2">
        <p className="text-sm text-stone-500">Forma de pago</p>
        <ul className="space-y-1 text-sm">
          {v.payments.map((pago) => (
            <li key={pago.id} className="flex items-center justify-between gap-4">
              <span className="text-stone-700">{pago.paymentMethod.name}</span>
              <span className="tabular text-stone-900">{formatMoney(pago.amount)}</span>
            </li>
          ))}
        </ul>

        {/* El vuelto queda persistido en la venta: reimprimir muestra lo
            mismo que el ticket original */}
        {vuelto > 0 && (
          <div className="space-y-1 border-t border-stone-100 pt-2 text-sm">
            <div className="flex items-center justify-between gap-4 text-stone-500">
              <span>Entregado</span>
              <span className="tabular">{formatMoney(entregado)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 font-medium text-stone-900">
              <span>Vuelto</span>
              <span className="tabular">{formatMoney(vuelto)}</span>
            </div>
          </div>
        )}
      </section>

      {v.notes !== null && (
        <section className="space-y-1">
          <p className="text-sm text-stone-500">Notas</p>
          <p className="text-sm whitespace-pre-line text-stone-700">{v.notes}</p>
        </section>
      )}

      <footer className="space-y-1 border-t border-stone-200 pt-6 text-xs text-stone-500">
        <p>¡Gracias por tu compra! Conservá este comprobante ante cualquier consulta.</p>
        <p>Atendió {v.seller.fullName || v.seller.username}</p>
      </footer>
    </ReceiptShell>
  );
}
