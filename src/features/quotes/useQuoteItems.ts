import { useCallback, useEffect, useMemo, useState } from "react";
import { toNumber } from "@/lib/format";
import type { PriceList, ProductDetail, ProductPrice } from "@/features/sales/types";
import type { QuoteItem } from "./types";

/** Mismo redondeo que el backend, para que los totales cierren al centavo. */
const round2 = (valor: number) => Math.round(valor * 100) / 100;

export interface QuoteLine {
  productId: number;
  sku: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  /** Precio de la lista elegida; sirve para marcar cuándo se bonifica. */
  listPrice: number | null;
  discount: number;
  /** Precios del producto, para recalcular si cambia la lista. */
  prices: ProductPrice[];
  /**
   * La línea viene de un presupuesto ya guardado: su precio está
   * congelado y no se recalcula al cambiar de lista.
   */
  congelada: boolean;
}

function resolverPrecio(
  prices: ProductPrice[],
  priceListId: number | null
): { unitPrice: number; listPrice: number | null } {
  const enLista =
    priceListId !== null ? prices.find((p) => p.priceListId === priceListId) : undefined;
  const elegido = enLista ?? prices[0];

  if (elegido === undefined) return { unitPrice: 0, listPrice: null };

  const price = toNumber(elegido.price);
  return { unitPrice: price, listPrice: enLista !== undefined ? price : null };
}

/**
 * Items del presupuesto. Es el carrito del POS pero con descuento por
 * línea y sin nada de pagos ni caja: un presupuesto no mueve plata.
 */
export function useQuoteItems(priceLists: PriceList[]) {
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [priceListId, setPriceListId] = useState<number | null>(null);

  // La lista por defecto manda mientras no se elija otra
  useEffect(() => {
    if (priceListId !== null || priceLists.length === 0) return;
    setPriceListId((priceLists.find((lista) => lista.isDefault) ?? priceLists[0]!).id);
  }, [priceLists, priceListId]);

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

        const { unitPrice, listPrice } = resolverPrecio(product.prices, priceListId);
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
            congelada: false,
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

  const setDiscount = useCallback((productId: number, discount: number) => {
    setLines((previas) =>
      previas.map((linea) =>
        linea.productId === productId ? { ...linea, discount: round2(discount) } : linea
      )
    );
  }, []);

  const removeLine = useCallback((productId: number) => {
    setLines((previas) => previas.filter((linea) => linea.productId !== productId));
  }, []);

  /** Carga los items de un presupuesto existente para editarlo. */
  const cargarDesdeQuote = useCallback((items: QuoteItem[]) => {
    setLines(
      items.map((item) => ({
        productId: item.productId,
        sku: item.product.sku,
        name: item.product.name,
        unit: item.product.unit,
        quantity: toNumber(item.quantity),
        unitPrice: toNumber(item.unitPrice),
        // No se sabe el precio de lista de un item guardado: el detalle
        // no trae la grilla de precios del producto, solo el congelado.
        listPrice: null,
        discount: toNumber(item.discount),
        prices: [],
        congelada: true,
      }))
    );
  }, []);

  /**
   * Cambiar de lista recalcula los precios, salvo los de las líneas
   * congeladas: si no, editar un presupuesto y cambiar de cliente
   * pondría en cero los precios que ya estaban acordados.
   */
  const changePriceList = useCallback((nuevaListaId: number) => {
    setPriceListId(nuevaListaId);
    setLines((previas) =>
      previas.map((linea) => {
        if (linea.congelada) return linea;
        const { unitPrice, listPrice } = resolverPrecio(linea.prices, nuevaListaId);
        return { ...linea, unitPrice, listPrice };
      })
    );
  }, []);

  /** Totales calculados igual que el backend (`totalsOf`). */
  const totals = useMemo(() => {
    const subtotal = round2(lines.reduce((suma, l) => suma + l.unitPrice * l.quantity, 0));
    const discount = round2(lines.reduce((suma, l) => suma + l.discount, 0));
    return { subtotal, discount, total: round2(subtotal - discount) };
  }, [lines]);

  return {
    lines,
    totals,
    priceListId,
    addProduct,
    setQuantity,
    setUnitPrice,
    setDiscount,
    removeLine,
    cargarDesdeQuote,
    changePriceList,
  };
}
