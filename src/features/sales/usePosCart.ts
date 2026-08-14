import { useCallback, useEffect, useMemo, useState } from "react";
import { toNumber } from "@/lib/format";
import type { CartLine, PriceList, ProductDetail, ProductPrice } from "./types";

/** Mismo redondeo que el backend, para que los totales cierren al centavo. */
const round2 = (value: number) => Math.round(value * 100) / 100;

/** Precio del producto en la lista elegida, o el primero que tenga. */
function resolvePrice(
  prices: ProductPrice[],
  priceListId: number | null
): { unitPrice: number; listPrice: number | null } {
  const enLista = priceListId !== null ? prices.find((p) => p.priceListId === priceListId) : undefined;
  const elegido = enLista ?? prices[0];

  if (elegido === undefined) return { unitPrice: 0, listPrice: null };

  const price = toNumber(elegido.price);
  // listPrice solo si es realmente el de la lista activa: si el producto
  // no cotiza en esa lista, no hay contra qué comparar un descuento.
  return { unitPrice: price, listPrice: enLista !== undefined ? price : null };
}

/**
 * Estado del carrito del POS.
 *
 * `priceLists` viene de GET /api/price-lists con la default primera, así
 * que el precio base sale del backend y no de adivinar cuál usar.
 */
export function usePosCart(priceLists: PriceList[]) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [priceListId, setPriceListId] = useState<number | null>(null);

  // La lista por defecto manda mientras el operador no elija otra
  useEffect(() => {
    if (priceListId !== null || priceLists.length === 0) return;
    const porDefecto = priceLists.find((lista) => lista.isDefault) ?? priceLists[0]!;
    setPriceListId(porDefecto.id);
  }, [priceLists, priceListId]);

  /**
   * Suma un producto. Si ya está en el carrito solo incrementa la
   * cantidad: escanear dos veces el mismo código no duplica la línea.
   */
  const addProduct = useCallback(
    (product: ProductDetail, quantity = 1) => {
      setLines((previas) => {
        const existente = previas.find((linea) => linea.productId === product.id);
        if (existente !== undefined) {
          return previas.map((linea) =>
            linea.productId === product.id
              ? { ...linea, quantity: round2(linea.quantity + quantity) }
              : linea
          );
        }

        const { unitPrice, listPrice } = resolvePrice(product.prices, priceListId);
        return [
          ...previas,
          {
            productId: product.id,
            sku: product.sku,
            name: product.name,
            unit: product.unit,
            quantity,
            unitPrice,
            listPrice,
            discount: 0,
            prices: product.prices,
          },
        ];
      });
    },
    [priceListId]
  );

  const setQuantity = useCallback((productId: number, quantity: number) => {
    setLines((previas) =>
      previas.map((linea) =>
        linea.productId === productId ? { ...linea, quantity: round2(quantity) } : linea
      )
    );
  }, []);

  const setUnitPrice = useCallback((productId: number, unitPrice: number) => {
    setLines((previas) =>
      previas.map((linea) =>
        linea.productId === productId ? { ...linea, unitPrice: round2(unitPrice) } : linea
      )
    );
  }, []);

  const removeLine = useCallback((productId: number) => {
    setLines((previas) => previas.filter((linea) => linea.productId !== productId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  /** Cambiar de lista recalcula los precios de todo el carrito. */
  const changePriceList = useCallback((nuevaListaId: number) => {
    setPriceListId(nuevaListaId);
    setLines((previas) =>
      previas.map((linea) => {
        const { unitPrice, listPrice } = resolvePrice(linea.prices, nuevaListaId);
        return { ...linea, unitPrice, listPrice };
      })
    );
  }, []);

  /**
   * Totales calculados igual que el backend (mismo orden de redondeo):
   * si difirieran, la validación "pagos == total" fallaría por centavos.
   */
  const totals = useMemo(() => {
    const subtotal = round2(lines.reduce((suma, l) => suma + l.unitPrice * l.quantity, 0));
    const discount = round2(lines.reduce((suma, l) => suma + l.discount, 0));
    return { subtotal, discount, total: round2(subtotal - discount) };
  }, [lines]);

  const units = useMemo(() => round2(lines.reduce((suma, l) => suma + l.quantity, 0)), [lines]);

  return {
    lines,
    totals,
    units,
    priceListId,
    addProduct,
    setQuantity,
    setUnitPrice,
    removeLine,
    clear,
    changePriceList,
  };
}

export { round2 };
