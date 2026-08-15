import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  LoadingBlock,
  PageHeader,
  Select,
} from "@/components/ui";
import { useRegisters } from "@/features/cash/api";
import { OpenRegisterScreen } from "@/features/cash/OpenRegisterScreen";
import { usePaymentMethods } from "@/features/sales/api";
import { PaymentPanel } from "@/features/sales/PaymentPanel";
import { calcularPagos, montoATexto, montoDe } from "@/features/sales/paymentRules";
import type { PaymentLine, SaleCreated } from "@/features/sales/types";
import { getApiErrorMessage, isApiError } from "@/lib/api";
import { formatDateTime, formatMoney, formatQuantity, toNumber } from "@/lib/format";
import { useDocumentTitle } from "@/lib/hooks";
import { conflictoDeStock, useConvertQuote, useQuote } from "./api";
import { QuoteItemsTable } from "./QuoteDetailPage";

/** Los pagos necesitan una clave estable para poder editarlos y borrarlos. */
let nextPaymentKey = 0;
const nuevoPago = (): PaymentLine => ({
  key: `pago-conv-${(nextPaymentKey += 1)}`,
  paymentMethodId: null,
  amount: "",
});

/**
 * Conversión de un presupuesto en venta.
 *
 * El presupuesto no tiene caja ni pagos, así que esta pantalla pide
 * exactamente eso y nada más: los items y sus precios CONGELADOS salen
 * del presupuesto y no se pueden tocar acá (el endpoint ni siquiera los
 * acepta en el body).
 */
export function QuoteConvertPage() {
  const { id } = useParams<{ id: string }>();
  const quoteId = Number(id);

  const navigate = useNavigate();
  const quote = useQuote(quoteId);
  const convertir = useConvertQuote(quoteId);
  const methods = usePaymentMethods();
  const registers = useRegisters(true);

  const [registerId, setRegisterId] = useState<number | null>(null);
  const [payments, setPayments] = useState<PaymentLine[]>([nuevoPago()]);
  const [confirmar, setConfirmar] = useState(false);
  const [ventaHecha, setVentaHecha] = useState<SaleCreated | null>(null);
  const [errorConversion, setErrorConversion] = useState<string | null>(null);

  useDocumentTitle(
    quote.data === undefined ? "Convertir presupuesto" : `Cobrar ${quote.data.number}`
  );

  const cajasAbiertas = useMemo(
    () => (registers.data ?? []).filter((caja) => caja.openSession !== null),
    [registers.data]
  );

  useEffect(() => {
    if (registerId !== null || cajasAbiertas.length === 0) return;
    setRegisterId(cajasAbiertas[0]!.id);
  }, [cajasAbiertas, registerId]);

  const total = toNumber(quote.data?.total);

  const totalesDePago = useMemo(
    () => calcularPagos(payments, methods.data ?? [], total),
    [payments, methods.data, total]
  );

  if (quote.isPending || registers.isPending) return <LoadingBlock label="Cargando…" />;

  if (quote.error !== null || quote.data === undefined) {
    return (
      <div className="space-y-8">
        <PageHeader title="Convertir presupuesto" />
        <Alert tone="danger" title="No se pudo cargar el presupuesto">
          {getApiErrorMessage(quote.error)}
        </Alert>
      </div>
    );
  }

  const q = quote.data;
  const vuelto = toNumber(ventaHecha?.changeGiven);

  /**
   * Conversión terminada.
   *
   * Se chequea ANTES que el estado del presupuesto: al convertir, el
   * detalle se refresca a CONVERTED y, sin esto, la pantalla se
   * reemplazaría por el cartel de "ya convertido" antes de que el cajero
   * llegue a ver el número de venta y el vuelto que tiene que entregar.
   */
  if (ventaHecha !== null) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Venta registrada"
          description={`Comprobante ${ventaHecha.number} · del presupuesto ${q.number}`}
        />

        <Card className="space-y-6">
          <div className="space-y-1">
            <p className="text-sm font-medium text-stone-500">Total cobrado</p>
            <p className="tabular text-4xl font-semibold tracking-tight text-brand-700">
              {formatMoney(ventaHecha.total)}
            </p>
          </div>

          {vuelto > 0 && (
            <div className="flex items-center justify-between gap-4 rounded-lg bg-emerald-50 px-4 py-3">
              <span className="text-sm font-medium text-emerald-800">Vuelto a entregar</span>
              <span className="tabular text-3xl font-semibold text-emerald-700">
                {formatMoney(vuelto)}
              </span>
            </div>
          )}

          <p className="text-sm text-stone-500">
            El presupuesto {q.number} quedó marcado como convertido y el stock ya se descontó.
          </p>

          <div className="flex flex-wrap items-center gap-3 border-t border-stone-100 pt-6">
            <Button onClick={() => navigate(`/presupuestos/${q.id}`)} autoFocus>
              Ver el presupuesto
            </Button>
            <Button variant="secondary" onClick={() => navigate("/presupuestos")}>
              Ir a presupuestos
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Vencido o ya cerrado: el backend rechaza la conversión con 409, así
  // que ni se ofrece el cobro.
  if (q.status !== "ACTIVE" || q.isExpired) {
    return (
      <div className="space-y-8">
        <PageHeader
          title={`Presupuesto ${q.number}`}
          actions={
            <Link
              to={`/presupuestos/${q.id}`}
              className="text-sm font-medium text-stone-500 hover:text-stone-800"
            >
              Volver al presupuesto
            </Link>
          }
        />
        <Alert tone="warning" title="Este presupuesto no se puede convertir">
          {q.isExpired
            ? `Venció el ${formatDateTime(q.expiresAt)}. Hay que hacer uno nuevo con los precios de hoy.`
            : q.status === "CONVERTED"
              ? `Ya se convirtió en la venta #${q.saleId}.`
              : "Está cancelado."}
        </Alert>
      </div>
    );
  }

  if (cajasAbiertas.length === 0) {
    return (
      <div className="space-y-8">
        <PageHeader
          title={`Cobrar ${q.number}`}
          description="Convertir un presupuesto es una venta: antes hay que abrir la caja del turno."
        />
        <OpenRegisterScreen onOpened={(nuevaId) => setRegisterId(nuevaId)} />
      </div>
    );
  }

  const cajaActual = cajasAbiertas.find((caja) => caja.id === registerId) ?? cajasAbiertas[0]!;
  const puedeCobrar = totalesDePago.ok && !convertir.isPending;

  const cobrar = () => {
    setConfirmar(false);
    setErrorConversion(null);

    convertir.mutate(
      {
        registerId: cajaActual.id,
        payments: payments.map((pago) => ({
          paymentMethodId: pago.paymentMethodId!,
          amount: montoDe(pago.amount),
        })),
      },
      {
        onSuccess: (resultado) => {
          setVentaHecha(resultado.sale);
          setPayments([nuevoPago()]);
        },
        onError: (error) => {
          const status = isApiError(error) ? error.response?.status : undefined;

          if (status === 409) {
            // El presupuesto NO reserva stock: puede haberse vendido en el medio
            const stock = conflictoDeStock(error);
            if (stock !== null) {
              const item = q.items.find((i) => i.productId === stock.productId);
              setErrorConversion(
                `No hay stock suficiente de ${item?.product.name ?? `el producto #${stock.productId}`}: ` +
                  `el presupuesto pide ${formatQuantity(stock.requested)} y hay ${formatQuantity(stock.available)}. ` +
                  "El presupuesto sigue activo: podés cobrar menos cantidad creando uno nuevo, o reponer stock."
              );
              return;
            }
          }

          setErrorConversion(getApiErrorMessage(error, "No se pudo convertir el presupuesto"));
        },
      }
    );
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Cobrar ${q.number}`}
        description="Los items y los precios vienen del presupuesto; acá solo se cargan la caja y los pagos."
        actions={
          <div className="flex flex-wrap items-center gap-3">
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
            <Link
              to={`/presupuestos/${q.id}`}
              className="text-sm font-medium text-stone-500 hover:text-stone-800"
            >
              Volver
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Card flush>
          <div className="p-6 sm:p-8">
            <CardHeader
              title="Lo que se va a vender"
              description={`Cliente: ${q.customer?.name ?? "sin cliente"} · precios congelados el ${formatDateTime(q.createdAt)}`}
            />
          </div>

          <QuoteItemsTable quote={q} />

          <div className="flex items-center justify-between gap-4 border-t border-stone-200 px-6 py-5 sm:px-8">
            <span className="text-sm font-medium text-stone-500">Total</span>
            <span className="tabular text-3xl font-semibold tracking-tight text-stone-900">
              {formatMoney(q.total)}
            </span>
          </div>
        </Card>

        <div className="xl:sticky xl:top-28 xl:self-start">
          <Card className="space-y-6">
            <div className="space-y-1">
              <p className="text-sm font-medium text-stone-500">A cobrar</p>
              <p className="tabular text-4xl font-semibold tracking-tight text-stone-900">
                {formatMoney(q.total)}
              </p>
            </div>

            <PaymentPanel
              total={total}
              payments={payments}
              methods={methods.data ?? []}
              methodsError={methods.error !== null ? getApiErrorMessage(methods.error) : null}
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
                  const falta = Math.round((total - yaPago) * 100) / 100;
                  return [
                    ...previos.slice(0, -1),
                    { ...ultimo, amount: montoATexto(Math.max(falta, 0)) },
                  ];
                })
              }
            />

            {errorConversion !== null && (
              <Alert tone="danger" title="No se pudo convertir">
                {errorConversion}
              </Alert>
            )}

            <Button
              size="lg"
              fullWidth
              loading={convertir.isPending}
              disabled={!puedeCobrar}
              onClick={() => setConfirmar(true)}
            >
              Convertir y cobrar {formatMoney(q.total)}
            </Button>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmar}
        title={`¿Convertir ${q.number} en venta?`}
        description="Se registra la venta, se descuenta el stock y el cobro entra a la caja. El presupuesto queda convertido."
        confirmLabel="Convertir y cobrar"
        loading={convertir.isPending}
        onCancel={() => setConfirmar(false)}
        onConfirm={cobrar}
      />

    </div>
  );
}
