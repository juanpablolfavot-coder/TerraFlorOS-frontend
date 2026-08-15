import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  CardHeader,
  LoadingBlock,
  PageHeader,
  Select,
  Textarea,
} from "@/components/ui";
import { PERMISSIONS, useAuth } from "@/features/auth";
import { useCustomer } from "@/features/customers/api";
import { CustomerPicker } from "@/features/customers/CustomerPicker";
import type { CustomerListItem } from "@/features/customers/types";
import { usePriceLists } from "@/features/sales/api";
import { ProductSearchBar } from "@/features/sales/ProductSearchBar";
import { getApiErrorMessage } from "@/lib/api";
import { formatMoney, formatQuantity } from "@/lib/format";
import { useDocumentTitle } from "@/lib/hooks";
import { useCreateQuote, useQuote, useUpdateQuote } from "./api";
import { QuoteItemsEditor } from "./QuoteItemsEditor";
import { useQuoteItems } from "./useQuoteItems";
import type { CreateQuoteBody } from "./types";

export function QuoteFormPage() {
  const { id } = useParams<{ id: string }>();
  const esAlta = id === undefined;
  const quoteId = esAlta ? null : Number(id);

  const navigate = useNavigate();
  const { can } = useAuth();
  const puedeEditarPrecio = can(PERMISSIONS.SALES_DISCOUNT);

  const priceLists = usePriceLists();
  const items = useQuoteItems(priceLists.data ?? []);
  const [cliente, setCliente] = useState<CustomerListItem | null>(null);
  const [notes, setNotes] = useState("");

  const buscadorRef = useRef<HTMLInputElement>(null);
  const quote = useQuote(quoteId);
  const crear = useCreateQuote();
  const editar = useUpdateQuote(quoteId ?? 0);

  // Al editar, el cliente guardado se trae completo para el selector (y
  // para saber si tiene lista asignada)
  const clienteGuardado = useCustomer(quote.data?.customerId ?? null);

  useDocumentTitle(esAlta ? "Nuevo presupuesto" : `Editar ${quote.data?.number ?? "presupuesto"}`);

  // Los items del presupuesto se cargan una sola vez
  const cargado = useRef(false);
  const { cargarDesdeQuote } = items;
  useEffect(() => {
    if (cargado.current || quote.data === undefined) return;
    cargado.current = true;
    cargarDesdeQuote(quote.data.items);
    setNotes(quote.data.notes ?? "");
  }, [quote.data, cargarDesdeQuote]);

  useEffect(() => {
    if (clienteGuardado.data === undefined || cliente !== null) return;
    setCliente(clienteGuardado.data);
  }, [clienteGuardado.data, cliente]);

  const listaPorDefecto = useMemo(() => {
    const listas = priceLists.data ?? [];
    return listas.find((lista) => lista.isDefault) ?? listas[0] ?? null;
  }, [priceLists.data]);

  /** Lista activa del cliente: el backend presupuesta con ella. */
  const listaDelCliente = useMemo(() => {
    if (cliente?.priceListId == null) return null;
    return (priceLists.data ?? []).find((lista) => lista.id === cliente.priceListId) ?? null;
  }, [cliente, priceLists.data]);

  const elegirCliente = (nuevo: CustomerListItem | null) => {
    setCliente(nuevo);

    const suya =
      nuevo?.priceListId == null
        ? undefined
        : (priceLists.data ?? []).find((lista) => lista.id === nuevo.priceListId);
    const lista = suya ?? listaPorDefecto;
    if (lista !== null && lista !== undefined && lista.id !== items.priceListId) {
      items.changePriceList(lista.id);
    }
  };

  const guardando = crear.isPending || editar.isPending;
  const errorServidor = crear.error ?? editar.error;
  const lineaNegativa = items.lines.some(
    (linea) => linea.unitPrice * linea.quantity - linea.discount < 0
  );
  const puedeGuardar = items.lines.length > 0 && !lineaNegativa && !guardando;

  const guardar = () => {
    if (!puedeGuardar) return;

    // Se manda SIEMPRE el unitPrice para que el precio guardado sea el que
    // se vio en pantalla: sin él, el backend recongelaría con el precio
    // vigente de la lista.
    const cuerpo: CreateQuoteBody = {
      customerId: cliente?.id ?? null,
      notes: notes.trim() === "" ? null : notes.trim(),
      items: items.lines.map((linea) => ({
        productId: linea.productId,
        quantity: linea.quantity,
        unitPrice: linea.unitPrice,
        ...(linea.discount > 0 ? { discount: linea.discount } : {}),
      })),
    };

    if (esAlta) {
      crear.mutate(cuerpo, {
        onSuccess: (creado) => navigate(`/presupuestos/${creado.id}`, { replace: true }),
      });
    } else {
      editar.mutate(cuerpo, {
        onSuccess: () => navigate(`/presupuestos/${quoteId}`, { replace: true }),
      });
    }
  };

  if (!esAlta && quote.isPending) return <LoadingBlock label="Cargando el presupuesto…" />;

  if (!esAlta && (quote.error !== null || quote.data === undefined)) {
    return (
      <div className="space-y-8">
        <PageHeader title="Presupuesto" />
        <Alert tone="danger" title="No se pudo cargar el presupuesto">
          {getApiErrorMessage(quote.error)}
        </Alert>
      </div>
    );
  }

  // Un presupuesto convertido, cancelado o vencido no se edita (el
  // backend responde 409): se avisa en vez de dejar cargar cambios.
  if (!esAlta && quote.data !== undefined && (quote.data.status !== "ACTIVE" || quote.data.isExpired)) {
    return (
      <div className="space-y-8">
        <PageHeader title={`Presupuesto ${quote.data.number}`} />
        <Alert tone="warning" title="Este presupuesto ya no se puede editar">
          {quote.data.isExpired
            ? "Venció, así que quedó cerrado a cambios. Podés cancelarlo o crear uno nuevo."
            : "Solo se editan los presupuestos activos."}
        </Alert>
        <Link
          to={`/presupuestos/${quote.data.id}`}
          className="text-sm font-medium text-stone-500 hover:text-stone-800"
        >
          Volver al presupuesto
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={esAlta ? "Nuevo presupuesto" : `Editar ${quote.data?.number ?? ""}`}
        description="Los precios quedan congelados al guardar: no cambian aunque cambie la lista."
        actions={
          <Link
            to={esAlta ? "/presupuestos" : `/presupuestos/${quoteId}`}
            className="text-sm font-medium text-stone-500 hover:text-stone-800"
          >
            Volver
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-6">
          <ProductSearchBar inputRef={buscadorRef} onAdd={items.addProduct} />

          <Card flush>
            <div className="p-6 sm:px-8">
              <CardHeader
                title="Items"
                description={
                  items.lines.length === 0
                    ? undefined
                    : `${items.lines.length} ${items.lines.length === 1 ? "producto" : "productos"} · ${formatQuantity(
                        items.lines.reduce((suma, l) => suma + l.quantity, 0)
                      )} unidades`
                }
              />
            </div>

            <QuoteItemsEditor
              lines={items.lines}
              puedeEditarPrecio={puedeEditarPrecio}
              onQuantityChange={items.setQuantity}
              onUnitPriceChange={items.setUnitPrice}
              onDiscountChange={items.setDiscount}
              onRemove={items.removeLine}
            />
          </Card>

          {(priceLists.data?.length ?? 0) > 1 && (
            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor="lista-presupuesto" className="text-sm text-stone-600">
                Lista de precios
              </label>
              <div className="w-56">
                <Select
                  id="lista-presupuesto"
                  value={items.priceListId ?? ""}
                  disabled={listaDelCliente !== null}
                  onChange={(event) => items.changePriceList(Number(event.target.value))}
                >
                  {(priceLists.data ?? []).map((lista) => (
                    <option key={lista.id} value={lista.id}>
                      {lista.name}
                      {lista.isDefault ? " (por defecto)" : ""}
                    </option>
                  ))}
                </Select>
              </div>
              {listaDelCliente !== null && (
                <p className="text-sm text-stone-500">
                  La fija el cliente: el backend presupuesta con su lista asignada.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="xl:sticky xl:top-28 xl:self-start">
          <Card className="space-y-6">
            <div className="space-y-3">
              <p className="text-sm font-medium text-stone-500">Cliente (opcional)</p>
              <CustomerPicker
                cliente={cliente}
                onChange={elegirCliente}
                listaAsignada={listaDelCliente?.name ?? null}
              />
            </div>

            <div className="border-t border-stone-100 pt-6">
              <Textarea
                label="Notas"
                placeholder="Ej: incluye entrega en obra"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>

            <div className="space-y-1 border-t border-stone-100 pt-6">
              <p className="text-sm font-medium text-stone-500">Total</p>
              <p className="tabular text-4xl font-semibold tracking-tight text-stone-900">
                {formatMoney(items.totals.total)}
              </p>
              {items.totals.discount > 0 && (
                <p className="text-sm text-stone-500">
                  Subtotal {formatMoney(items.totals.subtotal)} · descuentos{" "}
                  {formatMoney(items.totals.discount)}
                </p>
              )}
              <p className="pt-2 text-sm text-stone-500">
                El total definitivo lo calcula el backend al guardar.
              </p>
            </div>

            {lineaNegativa && (
              <Alert tone="warning" className="text-sm">
                Hay un descuento mayor al importe de la línea.
              </Alert>
            )}

            {errorServidor !== null && errorServidor !== undefined && (
              <Alert tone="danger" title="No se pudo guardar el presupuesto">
                {getApiErrorMessage(errorServidor)}
              </Alert>
            )}

            <Button size="lg" fullWidth loading={guardando} disabled={!puedeGuardar} onClick={guardar}>
              {esAlta ? "Crear presupuesto" : "Guardar cambios"}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
