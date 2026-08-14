import { useState, type KeyboardEvent, type RefObject } from "react";
import { Alert, Badge, Spinner } from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api";
import { useDebouncedValue } from "@/lib/hooks";
import { fetchProductByBarcode, fetchProductDetail, useProductSearch } from "./api";
import type { ProductDetail } from "./types";

/**
 * Buscador único del POS: sirve para escanear y para buscar por texto.
 *
 * - Enter → se asume código escaneado y se busca exacto por
 *   `/by-barcode/:code`; si existe, va derecho al carrito.
 * - Al tipear → resultados por nombre/SKU con debounce, para elegir con
 *   el mouse o el teclado.
 *
 * Tras cada alta el foco vuelve acá: se puede cargar una venta entera sin
 * tocar el mouse.
 */
export function ProductSearchBar({
  inputRef,
  onAdd,
  disabled = false,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  onAdd: (product: ProductDetail) => void;
  disabled?: boolean;
}) {
  const [term, setTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const debounced = useDebouncedValue(term, 300);
  const search = useProductSearch(debounced);

  const focus = () => inputRef.current?.focus();

  const agregar = (product: ProductDetail) => {
    onAdd(product);
    setTerm("");
    setError(null);
    focus();
  };

  /** Enter: primero se prueba como código exacto. */
  const handleKeyDown = async (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();

    const code = term.trim();
    if (code === "" || busy) return;

    setBusy(true);
    setError(null);
    try {
      const product = await fetchProductByBarcode(code);
      if (product !== null) {
        agregar(product);
      } else {
        // No es un código conocido: queda el texto para elegir de la lista
        setError(`No hay ningún producto con el código «${code}».`);
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(false);
      focus();
    }
  };

  /** Elegir un resultado: hace falta el detalle porque el listado no trae precios. */
  const handlePick = async (productId: number) => {
    setBusy(true);
    setError(null);
    try {
      agregar(await fetchProductDetail(productId));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const resultados = search.data ?? [];
  const mostrarResultados = debounced.trim().length >= 2 && !disabled;

  return (
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
          disabled={disabled}
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          onKeyDown={(event) => void handleKeyDown(event)}
          placeholder="Escaneá un código o buscá por nombre o SKU…"
          aria-label="Buscar o escanear producto"
          className={
            "h-14 w-full rounded-lg bg-white pr-12 pl-12 text-base text-stone-900 " +
            "ring-1 ring-stone-300 ring-inset placeholder:text-stone-400 " +
            "focus:ring-2 focus:ring-brand-600 focus:outline-none disabled:bg-stone-50"
          }
        />

        {(busy || search.isFetching) && (
          <span className="absolute top-1/2 right-4 -translate-y-1/2 text-stone-400">
            <Spinner size="sm" />
          </span>
        )}
      </div>

      {error !== null && (
        <Alert tone="warning" className="text-sm">
          {error}
        </Alert>
      )}

      {mostrarResultados && (
        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
          {search.isPending ? (
            <p className="px-4 py-6 text-center text-sm text-stone-500">Buscando…</p>
          ) : resultados.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-stone-500">
              Ningún producto coincide con «{debounced.trim()}».
            </p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {resultados.map((producto) => (
                <li key={producto.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handlePick(producto.id)}
                    className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-stone-50 disabled:opacity-50"
                  >
                    <span>
                      <span className="block font-medium text-stone-900">{producto.name}</span>
                      <span className="font-mono text-xs text-stone-500">{producto.sku}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {producto.kind === "PLANT" && <Badge tone="brand">Planta</Badge>}
                      <span className="text-sm text-stone-400">Agregar</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
