import { Link, useParams } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  LoadingBlock,
  PageHeader,
  StatCard,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import { PERMISSIONS, useAuth } from "@/features/auth";
import { getApiErrorMessage } from "@/lib/api";
import { formatDateTime, formatMoney, formatQuantityWithUnit, toNumber } from "@/lib/format";
import { useDocumentTitle } from "@/lib/hooks";
import type { AccionDeComprobante } from "@/lib/print";
import { useSale } from "./api";

/**
 * Detalle de una venta ya registrada.
 *
 * Existe sobre todo para poder volver a una venta pasada: ver qué se
 * cobró y **reimprimir el comprobante** o guardarlo en PDF. Los botones
 * abren la vista del comprobante ya disparando la acción (`?accion=`),
 * así reimprimir es un clic y no tres.
 */
export function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const saleId = Number(id);

  const { can } = useAuth();
  const verCostos = can(PERMISSIONS.PRODUCTS_VIEW_COST);

  const venta = useSale(Number.isFinite(saleId) ? saleId : null);

  useDocumentTitle(venta.data === undefined ? "Venta" : `Venta ${venta.data.number}`);

  const abrirComprobante = (accion?: AccionDeComprobante) => {
    const url = `/ventas/${saleId}/comprobante${accion === undefined ? "" : `?accion=${accion}`}`;
    window.open(url, "_blank", "noopener");
  };

  if (venta.isPending) return <LoadingBlock label="Cargando la venta…" />;

  if (venta.error !== null || venta.data === undefined) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Venta"
          actions={
            <Link to="/ventas" className="text-sm font-medium text-stone-500 hover:text-stone-800">
              Volver al POS
            </Link>
          }
        />
        <Alert tone="danger" title="No se pudo cargar la venta">
          {getApiErrorMessage(venta.error)}
        </Alert>
      </div>
    );
  }

  const v = venta.data;
  const anulada = v.status === "VOIDED";
  const vuelto = toNumber(v.changeGiven);
  const entregado = v.payments.reduce((suma, pago) => suma + toNumber(pago.amount), 0);

  const dato = (etiqueta: string, valor: string) => (
    <div className="space-y-1">
      <dt className="text-sm text-stone-500">{etiqueta}</dt>
      <dd className="text-stone-800">{valor}</dd>
    </div>
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Venta ${v.number}`}
        description={formatDateTime(v.createdAt)}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {anulada ? <Badge tone="danger">Anulada</Badge> : <Badge tone="success">Completada</Badge>}
            <Button onClick={() => abrirComprobante("imprimir")}>Imprimir</Button>
            <Button variant="secondary" onClick={() => abrirComprobante("pdf")}>
              Descargar PDF
            </Button>
            <button
              type="button"
              onClick={() => abrirComprobante()}
              className="text-sm font-medium text-stone-500 hover:text-stone-800"
            >
              Ver comprobante
            </button>
          </div>
        }
      />

      {anulada && (
        <Alert tone="danger" title="Esta venta está anulada">
          {v.voidReason ?? "Se repuso el stock y se revirtió el movimiento de caja."}
        </Alert>
      )}

      {v.oversold && (
        <Alert tone="warning" title="Venta sobre stock pendiente de regularizar">
          Se vendió sin stock disponible: el inventario quedó en negativo hasta que se cargue la
          mercadería.
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total" value={formatMoney(v.total)} tone="brand" />
        <StatCard
          label="Descuentos"
          value={formatMoney(v.discount)}
          hint={`Subtotal ${formatMoney(v.subtotal)}`}
        />
        <StatCard
          label="Vuelto entregado"
          value={formatMoney(vuelto)}
          hint={vuelto > 0 ? `Recibido ${formatMoney(entregado)}` : "Pago justo"}
        />
        {/* El margen es interno: solo con products.view_cost */}
        {verCostos && v.margin !== undefined ? (
          <StatCard
            label="Margen"
            value={formatMoney(v.margin)}
            hint={v.costTotal === undefined ? undefined : `Costo ${formatMoney(v.costTotal)}`}
          />
        ) : (
          <StatCard label="Ítems" value={String(v.items.length)} />
        )}
      </div>

      <Card className="space-y-6">
        <CardHeader title="Datos de la venta" />
        <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {dato("Cliente", v.customer?.name ?? "Consumidor final")}
          {dato("Vendedor", v.seller.fullName || v.seller.username)}
          {dato("Sucursal", v.branch.name)}
          {/* Dato interno, no va en el comprobante del cliente */}
          {dato("Lista de precios", v.priceList?.name ?? "—")}
        </dl>
        {v.notes !== null && (
          <div className="space-y-1 border-t border-stone-100 pt-5">
            <p className="text-sm text-stone-500">Notas</p>
            <p className="text-sm whitespace-pre-line text-stone-700">{v.notes}</p>
          </div>
        )}
      </Card>

      <Card flush>
        <div className="p-6 sm:p-8">
          <CardHeader title="Productos" />
        </div>
        <Table>
          <THead>
            <TR>
              <TH>Producto</TH>
              <TH align="right">Cantidad</TH>
              <TH align="right">Precio</TH>
              <TH align="right">Subtotal</TH>
            </TR>
          </THead>
          <TBody>
            {v.items.map((item) => (
              <TR key={item.id}>
                <TD>
                  <span className="font-medium text-stone-900">{item.product.name}</span>
                  <span className="block font-mono text-xs text-stone-500">{item.product.sku}</span>
                </TD>
                <TD align="right" numeric className="text-stone-600">
                  {formatQuantityWithUnit(item.quantity, item.product.unit)}
                </TD>
                <TD align="right" numeric className="text-stone-600">
                  {formatMoney(item.unitPrice)}
                  {toNumber(item.discount) > 0 && (
                    <span className="block text-xs text-stone-400">
                      − {formatMoney(item.discount)}
                    </span>
                  )}
                </TD>
                <TD align="right" numeric className="font-medium text-stone-900">
                  {formatMoney(item.total)}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>

      <Card flush>
        <div className="p-6 sm:p-8">
          <CardHeader
            title="Pagos"
            description="Los montos son lo que entregó el cliente: el vuelto se descuenta aparte."
          />
        </div>
        <Table>
          <THead>
            <TR>
              <TH>Medio de pago</TH>
              <TH>Referencia</TH>
              <TH align="right">Monto</TH>
            </TR>
          </THead>
          <TBody>
            {v.payments.map((pago) => (
              <TR key={pago.id}>
                <TD>
                  <span className="flex items-center gap-2 text-stone-800">
                    {pago.paymentMethod.name}
                    {pago.paymentMethod.affectsCash && <Badge tone="brand">Efectivo</Badge>}
                  </span>
                </TD>
                <TD className="text-stone-500">{pago.reference ?? "—"}</TD>
                <TD align="right" numeric className="font-medium text-stone-900">
                  {formatMoney(pago.amount)}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
