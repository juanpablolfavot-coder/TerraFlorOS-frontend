import { Alert, Badge, Card, CardHeader, Input, LoadingBlock } from "@/components/ui";
import { PERMISSIONS, useAuth } from "@/features/auth";
import { usePriceLists } from "@/features/sales/api";
import { useRedondeoPrecios } from "@/features/settings/api";
import { getApiErrorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import {
  FILA_VACIA,
  filaConMargen,
  filaConPrecio,
  numeroDe,
  recalcularFilas,
  type FilaPrecio,
} from "./pricing";

const CAMPO =
  "w-full rounded-lg bg-white px-3 py-2 text-right text-sm tabular ring-1 ring-stone-300 " +
  "ring-inset placeholder:text-stone-300 focus:ring-2 focus:ring-brand-600 focus:outline-none " +
  "disabled:bg-stone-50 disabled:text-stone-400";

/** El campo que se calculó solo lleva un tinte suave, para distinguirlo del fijado a mano. */
const CALCULADO = "bg-brand-50/50";

const COLUMNAS = "sm:grid-cols-[minmax(9rem,1fr)_7rem_1.25rem_9rem_minmax(7rem,1fr)]";

/**
 * Costo inicial y precios por lista del ALTA de producto, con margen ↔
 * precio bidireccional (la fórmula vive en `pricing.ts`: margen sobre
 * costo). En la EDICIÓN esta card no se usa: el costo ya no se toca desde
 * el catálogo y los precios se editan en `ProductPricesCard`.
 *
 * El estado (costo y filas) vive en `ProductForm`, que al crear manda el
 * costo como `initialCost` y los precios al PUT de precios.
 */
export function CostoPrecioCard({
  costo,
  filas,
  errorCosto,
  onCostoChange,
  onFilasChange,
}: {
  costo: string;
  filas: Record<number, FilaPrecio>;
  errorCosto?: string;
  onCostoChange: (valor: string) => void;
  onFilasChange: (filas: Record<number, FilaPrecio>) => void;
}) {
  const { can } = useAuth();
  const puedeCosto = can(PERMISSIONS.PRODUCTS_EDIT_COST);
  const puedePrecios = can(PERMISSIONS.PRICES_EDIT);

  const redondeo = useRedondeoPrecios();
  const listas = usePriceLists(puedePrecios);

  if (!puedeCosto && !puedePrecios) return null;

  const costoNum = numeroDe(costo);
  const hayCosto = costoNum !== null && costoNum > 0;
  const filaDe = (listaId: number): FilaPrecio => filas[listaId] ?? FILA_VACIA;

  const cambiarCosto = (texto: string) => {
    onCostoChange(texto);
    // Las filas ya fijadas recalculan su campo derivado con el costo nuevo
    onFilasChange(recalcularFilas(filas, numeroDe(texto), redondeo));
  };

  const cambiarMargen = (listaId: number, texto: string) =>
    onFilasChange({ ...filas, [listaId]: filaConMargen(filaDe(listaId), texto, costoNum, redondeo) });

  const cambiarPrecio = (listaId: number, texto: string) =>
    onFilasChange({ ...filas, [listaId]: filaConPrecio(texto, costoNum) });

  return (
    <Card className="space-y-6">
      <CardHeader
        title="Costo y precio"
        description="Escribí el margen o el precio: el otro se calcula solo. El margen es sobre el costo (precio = costo × (1 + margen/100))."
      />

      {puedeCosto ? (
        <div className="max-w-xs">
          <Input
            label="Costo inicial"
            inputMode="decimal"
            placeholder="0,00"
            value={costo}
            onChange={(event) => cambiarCosto(event.target.value)}
            error={errorCosto}
            hint="Punto de partida del costo; después se mueve solo por compras y ajustes."
          />
        </div>
      ) : (
        <p className="text-sm text-stone-500">
          Cargar el costo inicial requiere el permiso{" "}
          <code className="font-mono">products.edit_cost</code>. Sin costo, el margen no se
          calcula: el precio se carga directo.
        </p>
      )}

      {puedePrecios &&
        (listas.isPending ? (
          <LoadingBlock label="Cargando listas de precios…" />
        ) : listas.error !== null ? (
          <Alert tone="danger">{getApiErrorMessage(listas.error)}</Alert>
        ) : (
          <div className="space-y-3 border-t border-stone-100 pt-6">
            <div
              className={cn(
                "hidden gap-4 text-xs font-semibold tracking-wide text-stone-400 uppercase sm:grid",
                COLUMNAS
              )}
            >
              <span>Lista</span>
              <span className="text-right">Margen %</span>
              <span aria-hidden="true" />
              <span className="text-right">Precio</span>
              <span />
            </div>

            {(listas.data ?? []).map((lista) => {
              const fila = filaDe(lista.id);
              const precioNum = numeroDe(fila.precio);

              return (
                <div
                  key={lista.id}
                  className={cn("grid grid-cols-2 items-center gap-3 sm:gap-4", COLUMNAS)}
                >
                  <span className="col-span-2 flex items-center gap-2 sm:col-span-1">
                    <span className="font-medium text-stone-900">{lista.name}</span>
                    {lista.isDefault && <Badge tone="brand">Por defecto</Badge>}
                  </span>

                  <input
                    type="text"
                    inputMode="decimal"
                    aria-label={`Margen en ${lista.name}`}
                    className={cn(CAMPO, fila.fijado === "precio" && CALCULADO)}
                    placeholder={hayCosto ? "0" : "Sin costo"}
                    disabled={!hayCosto}
                    title={hayCosto ? undefined : "Sin costo no se puede calcular el margen."}
                    value={fila.margen}
                    onChange={(event) => cambiarMargen(lista.id, event.target.value)}
                  />

                  <span aria-hidden="true" className="hidden text-center text-stone-300 sm:block">
                    ⇄
                  </span>

                  <input
                    type="text"
                    inputMode="decimal"
                    aria-label={`Precio en ${lista.name}`}
                    className={cn(CAMPO, fila.fijado === "margen" && CALCULADO)}
                    placeholder="0,00"
                    value={fila.precio}
                    onChange={(event) => cambiarPrecio(lista.id, event.target.value)}
                  />

                  <span className="hidden text-sm text-stone-400 tabular sm:block">
                    {precioNum !== null && precioNum >= 0 ? formatMoney(precioNum) : ""}
                  </span>
                </div>
              );
            })}

            <p className="pt-1 text-xs text-stone-400">
              {hayCosto
                ? "Margen y precio se calculan entre sí; el campo sombreado es el calculado."
                : "Sin costo no hay margen: cargá el precio directo."}
              {redondeo > 0 &&
                ` Los precios calculados se redondean al múltiplo de ${redondeo} (configuración pricing.rounding).`}
            </p>
          </div>
        ))}
    </Card>
  );
}
