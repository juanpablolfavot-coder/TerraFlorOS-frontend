import { useEffect, useMemo, useRef, useState } from "react";
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
import { getApiErrorMessage, isApiError } from "@/lib/api";
import { formatMoney, formatQuantity } from "@/lib/format";
import { useDocumentTitle } from "@/lib/hooks";
import { useCreateSale, usePaymentMethods } from "./api";
import { CartList } from "./CartList";
import { PaymentPanel } from "./PaymentPanel";
import { ProductSearchBar } from "./ProductSearchBar";
import { usePosCart } from "./usePosCart";
import type { PaymentLine, SaleCreated, StockConflictDetails } from "./types";

/** Los pagos necesitan una clave estable para poder editarlos y borrarlos. */
let nextPaymentKey = 0;
const nuevoPago = (): PaymentLine => ({
  key: `pago-${(nextPaymentKey += 1)}`,
  paymentMethodId: null,
  amount: 0,
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
  const puedeVerCajas = can(PERMISSIONS.CASH_OPEN);
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

  const cart = usePosCart();
  const [payments, setPayments] = useState<PaymentLine[]>([nuevoPago()]);
  const [confirmarVaciar, setConfirmarVaciar] = useState(false);
  const [ventaHecha, setVentaHecha] = useState<SaleCreated | null>(null);
  const [errorVenta, setErrorVenta] = useState<string | null>(null);

  const buscadorRef = useRef<HTMLInputElement>(null);
  const methods = usePaymentMethods();
  const createSale = useCreateSale();

  const enfocarBuscador = () => buscadorRef.current?.focus();

  const pagado = Math.round(payments.reduce((s, p) => s + p.amount, 0) * 100) / 100;
  const restante = Math.round((cart.totals.total - pagado) * 100) / 100;

  const puedeCobrar =
    cart.lines.length > 0 &&
    registerId !== null &&
    payments.length > 0 &&
    payments.every((p) => p.paymentMethodId !== null && p.amount > 0) &&
    Math.abs(restante) < 0.005 &&
    !createSale.isPending;

  const reiniciarVenta = () => {
    cart.clear();
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
        // Se manda SIEMPRE el unitPrice para que el total del backend sea
        // idéntico al que se mostró: la validación "pagos == total" es
        // exacta y un centavo de diferencia rechaza la venta.
        items: cart.lines.map((linea) => ({
          productId: linea.productId,
          quantity: linea.quantity,
          unitPrice: linea.unitPrice,
          ...(linea.discount > 0 ? { discount: linea.discount } : {}),
        })),
        payments: payments.map((pago) => ({
          paymentMethodId: pago.paymentMethodId!,
          amount: pago.amount,
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

  if (!puedeVerCajas) {
    return (
      <div className="space-y-8">
        <PageHeader title="Ventas" />
        <Alert tone="warning" title="Pedí a un encargado que abra la caja">
          Para vender hace falta una caja abierta, y tu usuario no tiene el permiso{" "}
          <code className="font-mono">cash.open</code>, que el backend también exige para consultar
          el estado de las cajas.
        </Alert>
      </div>
    );
  }

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
    methods.error !== null
      ? isApiError(methods.error) && methods.error.response?.status === 404
        ? "El backend todavía no expone GET /api/payment-methods, así que no hay catálogo de métodos para cobrar."
        : getApiErrorMessage(methods.error)
      : null;

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
              onQuantityChange={cart.setQuantity}
              onUnitPriceChange={cart.setUnitPrice}
              onRemove={cart.removeLine}
            />
          </Card>

          {cart.knownPriceLists.length > 1 && (
            <div className="flex items-center gap-3">
              <label htmlFor="lista-precios" className="text-sm text-stone-600">
                Lista de precios
              </label>
              <div className="w-52">
                <Select
                  id="lista-precios"
                  value={cart.priceListId ?? ""}
                  onChange={(event) => cart.changePriceList(Number(event.target.value))}
                >
                  {cart.knownPriceLists.map((lista) => (
                    <option key={lista.id} value={lista.id}>
                      {lista.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Zona de cobro */}
        <div className="xl:sticky xl:top-28 xl:self-start">
          <Card className="space-y-6">
            <div className="space-y-1">
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
                    .reduce((suma, pago) => suma + pago.amount, 0);
                  const falta = Math.round((cart.totals.total - yaPago) * 100) / 100;
                  return [...previos.slice(0, -1), { ...ultimo, amount: Math.max(falta, 0) }];
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
        description="Se van a quitar todos los productos cargados y los pagos de esta venta."
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
          <Button
            onClick={() => {
              setVentaHecha(null);
              enfocarBuscador();
            }}
            autoFocus
          >
            Nueva venta
          </Button>
        }
      >
        <p className="tabular text-3xl font-semibold text-brand-700">
          {formatMoney(ventaHecha?.total)}
        </p>
        <p className="mt-2 text-sm text-stone-500">
          El carrito quedó vacío y el foco vuelve al buscador.
        </p>
      </Modal>
    </div>
  );
}
