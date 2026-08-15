import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  LoadingBlock,
  Modal,
  PageHeader,
  Select,
} from "@/components/ui";
import { PERMISSIONS, useAuth } from "@/features/auth";
import { useRegisters } from "@/features/cash/api";
import { OpenRegisterScreen } from "@/features/cash/OpenRegisterScreen";
import { CustomerPicker } from "@/features/customers/CustomerPicker";
import type { CustomerListItem } from "@/features/customers/types";
import { usePermiteStockNegativo } from "@/features/settings/api";
import { getApiErrorMessage, isApiError } from "@/lib/api";
import { formatMoney, formatQuantity, toNumber } from "@/lib/format";
import { useDocumentTitle } from "@/lib/hooks";
import { useCreateSale, usePaymentMethods, usePriceLists } from "./api";
import { CartList } from "./CartList";
import { calcularPagos, montoATexto, montoDe } from "./paymentRules";
import { PaymentPanel } from "./PaymentPanel";
import { ProductSearchBar } from "./ProductSearchBar";
import { usePosCart } from "./usePosCart";
import type { PaymentLine, SaleCreated, StockConflictDetails } from "./types";

/** Los pagos necesitan una clave estable para poder editarlos y borrarlos. */
let nextPaymentKey = 0;
const nuevoPago = (): PaymentLine => ({
  key: `pago-${(nextPaymentKey += 1)}`,
  paymentMethodId: null,
  amount: "",
});

/** Detalle del 409 de stock, si el error trae esa forma. */
function detalleDeStock(error: unknown): StockConflictDetails | null {
  if (!isApiError(error)) return null;
  const details = error.response?.data?.error?.details;
  if (
    typeof details === "object" &&
    details !== null &&
    "productId" in details &&
    "available" in details
  ) {
    return details as StockConflictDetails;
  }
  return null;
}

export function PosPage() {
  useDocumentTitle("Ventas");

  const { can } = useAuth();
  // El backend permite LEER cajas con sales.create o cash.open; abrirlas
  // sigue exigiendo cash.open.
  const puedeVerCajas = can(PERMISSIONS.SALES_CREATE) || can(PERMISSIONS.CASH_OPEN);
  const puedeEditarPrecio = can(PERMISSIONS.SALES_DISCOUNT);

  // ---------------------------------------------------------------
  // Caja: sin sesión abierta no se vende (el backend lo rechaza con 409)
  // ---------------------------------------------------------------

  const registers = useRegisters(puedeVerCajas);
  const [registerId, setRegisterId] = useState<number | null>(null);

  const cajasAbiertas = useMemo(
    () => (registers.data ?? []).filter((caja) => caja.openSession !== null),
    [registers.data]
  );

  useEffect(() => {
    if (registerId !== null || cajasAbiertas.length === 0) return;
    setRegisterId(cajasAbiertas[0]!.id);
  }, [cajasAbiertas, registerId]);

  // ---------------------------------------------------------------
  // Carrito y pagos
  // ---------------------------------------------------------------

  const priceLists = usePriceLists();
  const cart = usePosCart(priceLists.data ?? []);
  const [cliente, setCliente] = useState<CustomerListItem | null>(null);
  const [payments, setPayments] = useState<PaymentLine[]>([nuevoPago()]);
  const [confirmarVaciar, setConfirmarVaciar] = useState(false);
  const [ventaHecha, setVentaHecha] = useState<SaleCreated | null>(null);
  const [errorVenta, setErrorVenta] = useState<string | null>(null);

  const buscadorRef = useRef<HTMLInputElement>(null);
  const methods = usePaymentMethods();
  const createSale = useCreateSale();

  /**
   * `stock.allow_negative`. Leer la configuración alcanza con
   * `sales.create`, justamente para que el POS pueda avisar antes de
   * cobrar. Si no se pudo leer se asume `false`: el comportamiento
   * estricto de siempre.
   */
  const permiteStockNegativo = usePermiteStockNegativo();

  const enfocarBuscador = () => buscadorRef.current?.focus();

  /**
   * Estado del cobro con las mismas reglas que valida el backend: el
   * efectivo puede exceder el total (eso es el vuelto), los electrónicos no.
   */
  const totalesDePago = useMemo(
    () => calcularPagos(payments, methods.data ?? [], cart.totals.total),
    [payments, methods.data, cart.totals.total]
  );

  /**
   * Líneas que piden más de lo que hay. Con `allow_negative` activo esto
   * es solo un aviso; sin ella, el backend rechaza la venta con 409 y ese
   * error se muestra como siempre — no se bloquea de este lado, porque el
   * stock que conoce la pantalla puede estar desactualizado.
   */
  const hayLineasSinStock = cart.lines.some(
    (linea) => linea.availableStock !== null && linea.quantity > linea.availableStock
  );

  const puedeCobrar =
    cart.lines.length > 0 && registerId !== null && totalesDePago.ok && !createSale.isPending;

  // ---------------------------------------------------------------
  // Cliente (opcional) y su lista de precios
  // ---------------------------------------------------------------

  const listaPorDefecto = useMemo(() => {
    const listas = priceLists.data ?? [];
    return listas.find((lista) => lista.isDefault) ?? listas[0] ?? null;
  }, [priceLists.data]);

  /**
   * Lista ACTIVA del cliente. Se busca entre las que devuelve el backend
   * porque él hace lo mismo: si la lista asignada no está activa, cae a la
   * default. Mandar precios de otra lista haría que su validación de
   * "vender bajo precio de lista" rechace la venta.
   */
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
    if (lista !== null && lista !== undefined && lista.id !== cart.priceListId) {
      cart.changePriceList(lista.id);
    }
  };

  const reiniciarVenta = () => {
    cart.clear();
    elegirCliente(null);
    setPayments([nuevoPago()]);
    setErrorVenta(null);
    enfocarBuscador();
  };

  const cobrar = () => {
    if (!puedeCobrar || registerId === null) return;
    setErrorVenta(null);

    createSale.mutate(
      {
        registerId,
        // La venta puede ir sin cliente: solo viaja si se eligió uno
        ...(cliente !== null ? { customerId: cliente.id } : {}),
        // Se manda SIEMPRE el unitPrice para que el total del backend sea
        // idéntico al que se mostró: si difiriera por centavos, el vuelto
        // que calcula el servidor no sería el que vio el cajero.
        items: cart.lines.map((linea) => ({
          productId: linea.productId,
          quantity: linea.quantity,
          unitPrice: linea.unitPrice,
          ...(linea.discount > 0 ? { discount: linea.discount } : {}),
        })),
        // El pago va por el BRUTO entregado: el backend calcula el vuelto y
        // registra en la caja el neto que queda en el cajón.
        payments: payments.map((pago) => ({
          paymentMethodId: pago.paymentMethodId!,
          amount: montoDe(pago.amount),
        })),
      },
      {
        onSuccess: (venta) => {
          setVentaHecha(venta);
          reiniciarVenta();
        },
        onError: (error) => {
          const status = isApiError(error) ? error.response?.status : undefined;

          if (status === 409) {
            const stock = detalleDeStock(error);
            if (stock !== null) {
              const linea = cart.lines.find((l) => l.productId === stock.productId);
              setErrorVenta(
                `No hay stock suficiente de ${linea?.name ?? `el producto #${stock.productId}`}: ` +
                  `pediste ${formatQuantity(stock.requested)} y hay ${formatQuantity(stock.available)}.`
              );
              return;
            }
            // 409 sin detalle de stock = la caja dejó de estar abierta
            setErrorVenta(null);
            setRegisterId(null);
            void registers.refetch();
            return;
          }

          setErrorVenta(getApiErrorMessage(error, "No se pudo registrar la venta"));
        },
      }
    );
  };

  // ---------------------------------------------------------------
  // Estados previos al POS
  // ---------------------------------------------------------------

  if (registers.isPending) return <LoadingBlock label="Buscando la caja…" />;

  if (registers.error !== null) {
    return (
      <div className="space-y-8">
        <PageHeader title="Ventas" />
        <Alert tone="danger" title="No se pudo consultar el estado de la caja">
          {getApiErrorMessage(registers.error)}
        </Alert>
      </div>
    );
  }

  if (cajasAbiertas.length === 0) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Ventas"
          description="Antes de vender hay que abrir la caja del turno."
        />
        <OpenRegisterScreen onOpened={(id) => setRegisterId(id)} />
      </div>
    );
  }

  const cajaActual = cajasAbiertas.find((caja) => caja.id === registerId) ?? cajasAbiertas[0]!;
  const errorMetodos =
    methods.error !== null ? getApiErrorMessage(methods.error) : null;
  const vueltoDeLaVenta = toNumber(ventaHecha?.changeGiven);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Ventas"
        description="Escaneá o buscá productos, cargá el cobro y confirmá."
        actions={
          <div className="flex items-center gap-3">
            {cajasAbiertas.length > 1 ? (
              <div className="w-44">
                <Select
                  aria-label="Caja"
                  value={cajaActual.id}
                  onChange={(event) => setRegisterId(Number(event.target.value))}
                >
                  {cajasAbiertas.map((caja) => (
                    <option key={caja.id} value={caja.id}>
                      {caja.name}
                    </option>
                  ))}
                </Select>
              </div>
            ) : (
              <Badge tone="success">{cajaActual.name} abierta</Badge>
            )}
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        {/* Zona de carga */}
        <div className="space-y-6">
          <ProductSearchBar inputRef={buscadorRef} onAdd={cart.addProduct} />

          <Card flush>
            <div className="flex items-center justify-between gap-4 p-6 sm:px-8">
              <CardHeader
                title="Carrito"
                description={
                  cart.lines.length === 0
                    ? undefined
                    : `${cart.lines.length} ${cart.lines.length === 1 ? "producto" : "productos"} · ${formatQuantity(cart.units)} unidades`
                }
              />
              {cart.lines.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setConfirmarVaciar(true)}>
                  Vaciar
                </Button>
              )}
            </div>

            <CartList
              lines={cart.lines}
              puedeEditarPrecio={puedeEditarPrecio}
              permiteStockNegativo={permiteStockNegativo}
              onQuantityChange={cart.setQuantity}
              onUnitPriceChange={cart.setUnitPrice}
              onRemove={cart.removeLine}
            />
          </Card>

          {hayLineasSinStock && permiteStockNegativo && (
            <Alert tone="warning" className="text-sm">
              Hay productos sin stock suficiente. La venta se va a registrar igual y el stock va a
              quedar en negativo hasta que lo regularices.
            </Alert>
          )}

          {(priceLists.data?.length ?? 0) > 1 && (
            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor="lista-precios" className="text-sm text-stone-600">
                Lista de precios
              </label>
              <div className="w-52">
                <Select
                  id="lista-precios"
                  value={cart.priceListId ?? ""}
                  disabled={listaDelCliente !== null}
                  onChange={(event) => cart.changePriceList(Number(event.target.value))}
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
                  La fija el cliente: el backend factura con su lista asignada.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Zona de cobro */}
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

            <div className="space-y-1 border-t border-stone-100 pt-6">
              <p className="text-sm font-medium text-stone-500">Total</p>
              <p className="tabular text-4xl font-semibold tracking-tight text-stone-900">
                {formatMoney(cart.totals.total)}
              </p>
              {cart.totals.discount > 0 && (
                <p className="text-sm text-stone-500">
                  Subtotal {formatMoney(cart.totals.subtotal)} · descuentos{" "}
                  {formatMoney(cart.totals.discount)}
                </p>
              )}
            </div>

            <PaymentPanel
              total={cart.totals.total}
              payments={payments}
              methods={methods.data ?? []}
              methodsError={errorMetodos}
              totales={totalesDePago}
              onChange={(key, patch) =>
                setPayments((previos) =>
                  previos.map((pago) => (pago.key === key ? { ...pago, ...patch } : pago))
                )
              }
              onAdd={() => setPayments((previos) => [...previos, nuevoPago()])}
              onRemove={(key) =>
                setPayments((previos) => previos.filter((pago) => pago.key !== key))
              }
              onCompletar={() =>
                setPayments((previos) => {
                  if (previos.length === 0) return previos;
                  const ultimo = previos[previos.length - 1]!;
                  const yaPago = previos
                    .slice(0, -1)
                    .reduce((suma, pago) => suma + montoDe(pago.amount), 0);
                  const falta = Math.round((cart.totals.total - yaPago) * 100) / 100;
                  return [
                    ...previos.slice(0, -1),
                    { ...ultimo, amount: montoATexto(Math.max(falta, 0)) },
                  ];
                })
              }
            />

            {errorVenta !== null && (
              <Alert tone="danger" title="No se pudo cobrar">
                {errorVenta}
              </Alert>
            )}

            <Button
              size="lg"
              fullWidth
              onClick={cobrar}
              loading={createSale.isPending}
              disabled={!puedeCobrar}
            >
              Cobrar {cart.lines.length > 0 ? formatMoney(cart.totals.total) : ""}
            </Button>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmarVaciar}
        title="¿Vaciar el carrito?"
        description="Se van a quitar los productos cargados, los pagos y el cliente de esta venta."
        confirmLabel="Vaciar"
        onCancel={() => setConfirmarVaciar(false)}
        onConfirm={() => {
          setConfirmarVaciar(false);
          reiniciarVenta();
        }}
      />

      <Modal
        open={ventaHecha !== null}
        onClose={() => {
          setVentaHecha(null);
          enfocarBuscador();
        }}
        title="Venta registrada"
        description={`Comprobante ${ventaHecha?.number ?? ""}`}
        footer={
          <>
            {/* El comprobante se abre en otra pestaña para no perder el
                POS; también se puede reimprimir después desde la venta. */}
            <Button
              variant="secondary"
              onClick={() =>
                window.open(
                  `/ventas/${ventaHecha?.id}/comprobante?accion=imprimir`,
                  "_blank",
                  "noopener"
                )
              }
            >
              Imprimir comprobante
            </Button>
            <Button
              onClick={() => {
                setVentaHecha(null);
                enfocarBuscador();
              }}
              autoFocus
            >
              Nueva venta
            </Button>
          </>
        }
      >
        <p className="tabular text-3xl font-semibold text-brand-700">
          {formatMoney(ventaHecha?.total)}
        </p>
        {ventaHecha?.customer != null && (
          <p className="mt-2 text-sm text-stone-700">
            Cliente: <span className="font-medium">{ventaHecha.customer.name}</span>
          </p>
        )}

        {/* El vuelto sale de la respuesta, no de lo que calculó la pantalla */}
        {vueltoDeLaVenta > 0 && (
          <div className="mt-4 flex items-center justify-between gap-4 rounded-lg bg-emerald-50 px-4 py-3">
            <span className="text-sm font-medium text-emerald-800">Vuelto a entregar</span>
            <span className="tabular text-2xl font-semibold text-emerald-700">
              {formatMoney(vueltoDeLaVenta)}
            </span>
          </div>
        )}

        {ventaHecha?.oversold === true && (
          <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Venta sobre stock pendiente de regularizar: se vendió sin stock disponible.
          </p>
        )}

        <p className="mt-4 text-sm text-stone-500">
          El carrito quedó vacío y el foco vuelve al buscador.{" "}
          {ventaHecha !== null && (
            <Link
              to={`/ventas/${ventaHecha.id}`}
              className="font-medium text-brand-700 hover:text-brand-800"
            >
              Ver la venta
            </Link>
          )}
        </p>
      </Modal>
    </div>
  );
}
