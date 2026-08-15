import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Alert, Badge, Button, Card, LoadingBlock, PageHeader, Select, Spinner } from "@/components/ui";
import { useProduct } from "@/features/products/api";
import { usePriceLists } from "@/features/sales/api";
import { getApiErrorMessage } from "@/lib/api";
import { formatMoney, formatQuantity, toNumber } from "@/lib/format";
import { useDebouncedValue, useDocumentTitle } from "@/lib/hooks";
import { fetchProductByCode, useAvailableStock, useProductSearch } from "./api";
import type { PlantDetail, ProductDetail } from "@/features/products/types";

/** Producto elegido. El SKU se guarda porque el stock se busca por él. */
interface Elegido {
  id: number;
  sku: string;
}

/**
 * Plural del nombre de la unidad: unidad → unidades, bolsa → bolsas. Las
 * abreviaturas (kg, m2) se dejan como están.
 */
function unidadEnPlural(unit: string, cantidad: number): string {
  if (cantidad === 1) return unit;
  if (/[aeiouáéíóú]$/i.test(unit)) return `${unit}s`;
  if (/[a-zñáéíóú]{3,}$/i.test(unit)) return `${unit}es`;
  return unit;
}

/** Datos de la ficha botánica que sirven en el mostrador. */
function datosDePlanta(ficha: PlantDetail): Array<{ etiqueta: string; valor: string }> {
  const filas: Array<{ etiqueta: string; valor: string | null }> = [
    { etiqueta: "Tamaño", valor: ficha.sizeLabel },
    { etiqueta: "Exposición", valor: ficha.lightRequirement },
    { etiqueta: "Ambiente", valor: ficha.environment },
    { etiqueta: "Riego", valor: ficha.wateringFrequency },
  ];
  return filas.filter((fila): fila is { etiqueta: string; valor: string } => fila.valor !== null);
}

/** Ficha del producto, pensada para mostrarle la pantalla al cliente. */
function ResultadoDeConsulta({
  producto,
  precio,
  listaElegida,
  listas,
  onCambiarLista,
  stockDisponible,
  cargandoStock,
}: {
  producto: ProductDetail;
  /** `null` = el producto no cotiza en la lista elegida. */
  precio: number | null;
  listaElegida: number | null;
  listas: Array<{ id: number; name: string; isDefault: boolean }>;
  onCambiarLista: (id: number) => void;
  stockDisponible: number | null;
  cargandoStock: boolean;
}) {
  const sinStock = stockDisponible !== null && stockDisponible <= 0;

  return (
    <Card className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
          {producto.name}
        </h2>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-mono text-stone-500">{producto.sku}</span>
          {producto.category !== null && (
            <span className="text-stone-500">{producto.category.name}</span>
          )}
          {producto.plantDetail?.scientificName != null && (
            <span className="text-stone-400 italic">{producto.plantDetail.scientificName}</span>
          )}
        </div>
      </div>

      <div className="space-y-3 border-t border-stone-100 pt-8">
        {precio === null ? (
          <>
            <p className="text-3xl font-semibold text-stone-400 sm:text-4xl">Sin precio</p>
            <p className="text-sm text-stone-500">
              El producto no está cargado en esta lista. Consultá con el encargado antes de
              venderlo.
            </p>
          </>
        ) : (
          <p className="tabular text-6xl font-semibold tracking-tight text-brand-700 sm:text-7xl">
            {formatMoney(precio)}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          {listas.length > 1 ? (
            <>
              <label htmlFor="lista-consulta" className="text-sm text-stone-600">
                Lista de precios
              </label>
              <div className="w-60">
                <Select
                  id="lista-consulta"
                  value={listaElegida ?? ""}
                  onChange={(event) => onCambiarLista(Number(event.target.value))}
                >
                  {listas.map((lista) => (
                    <option key={lista.id} value={lista.id}>
                      {lista.name}
                      {lista.isDefault ? " (por defecto)" : ""}
                    </option>
                  ))}
                </Select>
              </div>
            </>
          ) : (
            listas[0] !== undefined && (
              <p className="text-sm text-stone-500">Lista {listas[0].name}</p>
            )
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-stone-100 pt-8">
        <span className="text-sm text-stone-500">Stock disponible</span>
        {cargandoStock ? (
          <Spinner size="sm" />
        ) : stockDisponible === null ? (
          <span className="text-stone-500">—</span>
        ) : (
          <Badge tone={sinStock ? "warning" : "success"}>
            {sinStock
              ? "Sin stock"
              : `${formatQuantity(stockDisponible)} ${unidadEnPlural(producto.unit, stockDisponible)}`}
          </Badge>
        )}
      </div>

      {producto.plantDetail !== null && datosDePlanta(producto.plantDetail).length > 0 && (
        <dl className="grid gap-5 border-t border-stone-100 pt-8 sm:grid-cols-2 lg:grid-cols-4">
          {datosDePlanta(producto.plantDetail).map((fila) => (
            <div key={fila.etiqueta} className="space-y-1">
              <dt className="text-sm text-stone-500">{fila.etiqueta}</dt>
              <dd className="text-stone-800">{fila.valor}</dd>
            </div>
          ))}
        </dl>
      )}
    </Card>
  );
}

/**
 * Consulta de precios: pantalla de mostrador para responder "¿cuánto está
 * esto?" sin entrar al POS ni tocar el carrito.
 *
 * Es de cara al público: muestra precio de VENTA y stock, nunca costos ni
 * márgenes, tenga o no el usuario `products.view_cost`.
 */
export function PriceLookupPage() {
  useDocumentTitle("Consulta de precios");

  const [term, setTerm] = useState("");
  const [elegido, setElegido] = useState<Elegido | null>(null);
  const [priceListId, setPriceListId] = useState<number | null>(null);
  const [avisoCodigo, setAvisoCodigo] = useState<string | null>(null);
  const [buscandoCodigo, setBuscandoCodigo] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const enfocar = () => inputRef.current?.focus();

  const debounced = useDebouncedValue(term, 300);
  const busqueda = useProductSearch(debounced);
  const detalle = useProduct(elegido?.id ?? null);
  const stock = useAvailableStock(elegido?.sku ?? null, elegido?.id ?? null);
  const listas = usePriceLists();

  // La lista por defecto manda mientras no se elija otra
  useEffect(() => {
    const disponibles = listas.data ?? [];
    if (priceListId !== null || disponibles.length === 0) return;
    setPriceListId((disponibles.find((lista) => lista.isDefault) ?? disponibles[0]!).id);
  }, [listas.data, priceListId]);

  const elegirProducto = (id: number, sku: string) => {
    setElegido({ id, sku });
    setTerm("");
    setAvisoCodigo(null);
    enfocar();
  };

  const limpiar = () => {
    setElegido(null);
    setTerm("");
    setAvisoCodigo(null);
    enfocar();
  };

  /** Enter: se asume código escaneado y se busca exacto. */
  const handleKeyDown = async (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      limpiar();
      return;
    }
    if (event.key !== "Enter") return;
    event.preventDefault();

    const code = term.trim();
    if (code === "" || buscandoCodigo) return;

    setBuscandoCodigo(true);
    setAvisoCodigo(null);
    try {
      const producto = await fetchProductByCode(code);
      if (producto !== null) {
        elegirProducto(producto.id, producto.sku);
      } else {
        // Puede ser texto y no un código: la lista de abajo sigue sirviendo
        setAvisoCodigo(`No hay ningún producto con el código «${code}».`);
      }
    } catch (error) {
      setAvisoCodigo(getApiErrorMessage(error));
    } finally {
      setBuscandoCodigo(false);
      enfocar();
    }
  };

  const producto = detalle.data;

  /** Precio del producto en la lista elegida, o `null` si no cotiza. */
  const precio = useMemo(() => {
    if (producto === undefined || priceListId === null) return null;
    const fila = producto.prices.find((p) => p.priceListId === priceListId);
    return fila === undefined ? null : toNumber(fila.price);
  }, [producto, priceListId]);

  const resultados = busqueda.data ?? [];
  const mostrarResultados = elegido === null && debounced.trim().length >= 2;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Consulta de precios"
        description="Escaneá o buscá un producto para ver su precio de venta."
        actions={
          elegido !== null && (
            <Button variant="secondary" onClick={limpiar}>
              Consultar otro
            </Button>
          )
        }
      />

      <div className="space-y-3">
        <div className="relative">
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-stone-400"
          >
            <circle cx="9" cy="9" r="6" />
            <path d="m13.5 13.5 4 4" strokeLinecap="round" />
          </svg>

          <input
            ref={inputRef}
            type="text"
            autoFocus
            value={term}
            onChange={(event) => {
              setTerm(event.target.value);
              // Escribir de nuevo arranca otra consulta
              if (elegido !== null) setElegido(null);
            }}
            onKeyDown={(event) => void handleKeyDown(event)}
            placeholder="Escaneá un código o buscá por nombre o SKU…"
            aria-label="Buscar o escanear producto"
            className={
              "h-14 w-full rounded-lg bg-white pr-12 pl-12 text-base text-stone-900 " +
              "ring-1 ring-stone-300 ring-inset placeholder:text-stone-400 " +
              "focus:ring-2 focus:ring-brand-600 focus:outline-none"
            }
          />

          {(buscandoCodigo || busqueda.isFetching) && (
            <span className="absolute top-1/2 right-4 -translate-y-1/2 text-stone-400">
              <Spinner size="sm" />
            </span>
          )}
        </div>

        {avisoCodigo !== null && (
          <Alert tone="warning" className="text-sm">
            {avisoCodigo}
          </Alert>
        )}

        {mostrarResultados && (
          <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
            {busqueda.isPending ? (
              <p className="px-4 py-6 text-center text-sm text-stone-500">Buscando…</p>
            ) : busqueda.error !== null ? (
              <p className="px-4 py-6 text-center text-sm text-red-600">
                {getApiErrorMessage(busqueda.error)}
              </p>
            ) : resultados.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-stone-500">
                Ningún producto coincide con «{debounced.trim()}».
              </p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {resultados.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => elegirProducto(item.id, item.sku)}
                      className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-stone-50"
                    >
                      <span>
                        <span className="block font-medium text-stone-900">{item.name}</span>
                        <span className="font-mono text-xs text-stone-500">{item.sku}</span>
                      </span>
                      <span className="tabular shrink-0 text-sm text-stone-500">
                        {item.defaultPrice === null ? "Sin precio" : formatMoney(item.defaultPrice)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {elegido !== null &&
        (detalle.isPending ? (
          <LoadingBlock label="Cargando el producto…" />
        ) : detalle.error !== null || producto === undefined ? (
          <Alert tone="danger" title="No se pudo cargar el producto">
            {getApiErrorMessage(detalle.error)}
          </Alert>
        ) : (
          <ResultadoDeConsulta
            producto={producto}
            precio={precio}
            listaElegida={priceListId}
            listas={listas.data ?? []}
            onCambiarLista={setPriceListId}
            stockDisponible={stock.data?.availableStock ?? null}
            cargandoStock={stock.isPending}
          />
        ))}
    </div>
  );
}
