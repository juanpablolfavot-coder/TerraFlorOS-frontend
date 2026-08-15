import { useParams } from "react-router-dom";
import { Alert, LoadingBlock } from "@/components/ui";
import { ReceiptShell } from "@/components/receipt/ReceiptShell";
import { useAuth } from "@/features/auth";
import { getApiErrorMessage } from "@/lib/api";
import { formatDate, formatMoney, formatQuantityWithUnit, toNumber } from "@/lib/format";
import { useDocumentTitle } from "@/lib/hooks";
import { useQuote } from "./api";

/**
 * Presupuesto para imprimir o mostrarle al cliente.
 *
 * Solo datos que el cliente puede ver: NO va la lista de precios de la
 * que salieron los importes (que sea mayorista o minorista es interno),
 * ni costos ni márgenes.
 */
export function QuotePrintPage() {
  const { id } = useParams<{ id: string }>();
  const quote = useQuote(Number(id));
  const { user } = useAuth();

  useDocumentTitle(quote.data === undefined ? "Presupuesto" : `Presupuesto ${quote.data.number}`);

  if (quote.isPending) return <LoadingBlock label="Cargando el presupuesto…" />;

  if (quote.error !== null || quote.data === undefined) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <Alert tone="danger" title="No se pudo cargar el presupuesto">
          {getApiErrorMessage(quote.error)}
        </Alert>
      </div>
    );
  }

  const q = quote.data;

  return (
    <ReceiptShell
      tipo="Presupuesto"
      numero={q.number}
      fecha={q.createdAt}
      sucursal={q.branch.name}
      archivo={`Presupuesto ${q.number}`}
    >
      <section className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-1">
          <p className="text-sm text-stone-500">Cliente</p>
          <p className="text-stone-900">{q.customer?.name ?? "Consumidor final"}</p>
        </div>
        <div className="space-y-1 sm:text-right">
          <p className="text-sm text-stone-500">Válido hasta</p>
          <p className={q.isExpired ? "font-medium text-amber-700" : "text-stone-900"}>
            {formatDate(q.expiresAt)}
            {q.isExpired ? " · VENCIDO" : ""}
          </p>
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
          {q.items.map((item) => (
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

      <div className="flex items-center justify-between gap-4 border-t-2 border-stone-300 pt-5">
        <span className="font-medium text-stone-700">Total</span>
        <span className="tabular text-3xl font-semibold text-stone-900">
          {formatMoney(q.total)}
        </span>
      </div>

      {q.notes !== null && (
        <section className="space-y-1">
          <p className="text-sm text-stone-500">Notas</p>
          <p className="text-sm whitespace-pre-line text-stone-700">{q.notes}</p>
        </section>
      )}

      <footer className="space-y-1 border-t border-stone-200 pt-6 text-xs text-stone-500">
        <p>
          Precios válidos hasta el {formatDate(q.expiresAt)}. Sujeto a disponibilidad de stock:
          este presupuesto no reserva mercadería.
        </p>
        {/* Solo quién atendió: la lista de precios usada es interna */}
        <p>Atendió {q.createdBy.fullName || user?.username}</p>
      </footer>
    </ReceiptShell>
  );
}
