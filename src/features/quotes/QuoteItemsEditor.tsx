import { Badge, EmptyState, Table, TBody, TD, TH, THead, TR } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { QuoteLine } from "./useQuoteItems";

const INPUT =
  "w-full rounded-lg bg-white px-2.5 py-1.5 text-right text-sm tabular ring-1 ring-stone-300 " +
  "ring-inset focus:ring-2 focus:ring-brand-600 focus:outline-none " +
  "disabled:bg-stone-50 disabled:text-stone-500";

/** Items del presupuesto, editables. El precio solo con `sales.discount`. */
export function QuoteItemsEditor({
  lines,
  puedeEditarPrecio,
  onQuantityChange,
  onUnitPriceChange,
  onDiscountChange,
  onRemove,
}: {
  lines: QuoteLine[];
  puedeEditarPrecio: boolean;
  onQuantityChange: (productId: number, quantity: number) => void;
  onUnitPriceChange: (productId: number, unitPrice: number) => void;
  onDiscountChange: (productId: number, discount: number) => void;
  onRemove: (productId: number) => void;
}) {
  if (lines.length === 0) {
    return (
      <EmptyState
        title="El presupuesto está vacío"
        description="Buscá un producto por nombre o escaneá su código para agregarlo."
      />
    );
  }

  return (
    <Table>
      <THead>
        <TR>
          <TH>Producto</TH>
          <TH align="right" className="w-24">
            Cantidad
          </TH>
          <TH align="right" className="w-32">
            Precio
          </TH>
          <TH align="right" className="w-28">
            Descuento
          </TH>
          <TH align="right" className="w-32">
            Subtotal
          </TH>
          <TH align="right" className="w-14">
            <span className="sr-only">Quitar</span>
          </TH>
        </TR>
      </THead>

      <TBody>
        {lines.map((linea) => {
          const subtotal = linea.unitPrice * linea.quantity - linea.discount;
          const bonificado = linea.listPrice !== null && linea.unitPrice < linea.listPrice;

          return (
            <TR key={linea.productId}>
              <TD>
                <span className="font-medium text-stone-900">{linea.name}</span>
                <span className="mt-0.5 flex items-center gap-2">
                  <span className="font-mono text-xs text-stone-500">{linea.sku}</span>
                  {linea.congelada && <Badge tone="neutral">Precio congelado</Badge>}
                  {bonificado && <Badge tone="warning">Bonificado</Badge>}
                </span>
              </TD>

              <TD align="right">
                <input
                  type="number"
                  className={INPUT}
                  min={0.01}
                  step="any"
                  value={linea.quantity}
                  aria-label={`Cantidad de ${linea.name}`}
                  onChange={(event) => {
                    const valor = Number(event.target.value);
                    if (Number.isFinite(valor) && valor > 0) onQuantityChange(linea.productId, valor);
                  }}
                />
              </TD>

              <TD align="right">
                <input
                  type="number"
                  className={cn(INPUT, !puedeEditarPrecio && "cursor-not-allowed")}
                  min={0}
                  step="any"
                  value={linea.unitPrice}
                  disabled={!puedeEditarPrecio}
                  aria-label={`Precio unitario de ${linea.name}`}
                  title={
                    puedeEditarPrecio
                      ? undefined
                      : "Editar el precio requiere el permiso sales.discount"
                  }
                  onChange={(event) => {
                    const valor = Number(event.target.value);
                    if (Number.isFinite(valor) && valor >= 0) {
                      onUnitPriceChange(linea.productId, valor);
                    }
                  }}
                />
              </TD>

              <TD align="right">
                <input
                  type="number"
                  className={cn(INPUT, !puedeEditarPrecio && "cursor-not-allowed")}
                  min={0}
                  step="any"
                  value={linea.discount}
                  disabled={!puedeEditarPrecio}
                  aria-label={`Descuento de ${linea.name}`}
                  title={
                    puedeEditarPrecio
                      ? undefined
                      : "Descontar requiere el permiso sales.discount"
                  }
                  onChange={(event) => {
                    const valor = Number(event.target.value);
                    if (Number.isFinite(valor) && valor >= 0) {
                      onDiscountChange(linea.productId, valor);
                    }
                  }}
                />
              </TD>

              <TD
                align="right"
                numeric
                className={cn("font-medium", subtotal < 0 ? "text-red-600" : "text-stone-900")}
              >
                {formatMoney(subtotal)}
              </TD>

              <TD align="right">
                <button
                  type="button"
                  onClick={() => onRemove(linea.productId)}
                  aria-label={`Quitar ${linea.name}`}
                  className="rounded-md p-1.5 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.6}
                    strokeLinecap="round"
                    className="size-4"
                    aria-hidden="true"
                  >
                    <path d="m6 6 12 12M18 6 6 18" />
                  </svg>
                </button>
              </TD>
            </TR>
          );
        })}
      </TBody>
    </Table>
  );
}
