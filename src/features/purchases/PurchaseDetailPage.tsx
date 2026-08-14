import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  LoadingBlock,
  PageHeader,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import { Can, PERMISSIONS } from "@/features/auth";
import { getApiErrorMessage } from "@/lib/api";
import { formatDate, formatDateTime, formatMoney, formatQuantity, toNumber } from "@/lib/format";
import { useDocumentTitle } from "@/lib/hooks";
import {
  conflictoDeTransicion,
  useChangeStatus,
  useCreatePurchase,
  usePurchase,
  useUpdatePurchase,
} from "./api";
import { PurchaseForm } from "./PurchaseForm";
import { PurchaseStatusBadge } from "./PurchaseStatusBadge";
import { ReceiveDialog } from "./ReceiveDialog";
import {
  EDITABLE_STATUSES,
  MANUAL_TRANSITIONS,
  PURCHASE_STATUS_LABEL,
  RECEIVABLE_STATUSES,
  type CreatePurchaseBody,
  type PurchaseStatus,
} from "./types";

/** Texto del botón para cada transición manual. */
const ACCION: Record<PurchaseStatus, string> = {
  DRAFT: "Volver a borrador",
  REQUESTED: "Solicitar",
  APPROVED: "Aprobar",
  SENT: "Marcar como enviada",
  PARTIALLY_RECEIVED: "Recibida en parte",
  RECEIVED: "Recibida",
  CANCELLED: "Cancelar orden",
};

export function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const esAlta = id === "nueva";
  const purchaseId = esAlta ? null : Number(id);

  const navigate = useNavigate();

  const compra = usePurchase(purchaseId);
  const crear = useCreatePurchase();
  const editar = useUpdatePurchase(purchaseId ?? 0);
  const cambiarEstado = useChangeStatus(purchaseId ?? 0);

  const [editando, setEditando] = useState(false);
  const [recibiendo, setRecibiendo] = useState(false);
  const [transicionPendiente, setTransicionPendiente] = useState<PurchaseStatus | null>(null);

  useDocumentTitle(esAlta ? "Nueva compra" : `Compra #${id ?? ""}`);

  const guardar = (body: CreatePurchaseBody) => {
    if (esAlta) {
      crear.mutate(body, {
        onSuccess: (creada) => navigate(`/compras/${creada.id}`, { replace: true }),
      });
    } else {
      // El PATCH no acepta branchId: la sucursal no se cambia
      const { branchId: _branchId, ...resto } = body;
      editar.mutate(resto, { onSuccess: () => setEditando(false) });
    }
  };

  if (esAlta) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Nueva compra"
          description="Elegí el proveedor y cargá los productos. Queda en borrador."
          actions={
            <Link to="/compras" className="text-sm font-medium text-stone-500 hover:text-stone-800">
              Volver
            </Link>
          }
        />
        <PurchaseForm
          compra={null}
          guardando={crear.isPending}
          errorServidor={crear.error}
          alertaPct={15}
          onSubmit={guardar}
          onCancel={() => navigate("/compras")}
        />
      </div>
    );
  }

  if (compra.isPending) return <LoadingBlock label="Cargando la compra…" />;

  if (compra.error !== null || compra.data === undefined) {
    return (
      <div className="space-y-8">
        <PageHeader title="Compra" />
        <Alert tone="danger" title="No se pudo cargar la compra">
          {getApiErrorMessage(compra.error)}
        </Alert>
      </div>
    );
  }

  const orden = compra.data;
  const transiciones = MANUAL_TRANSITIONS[orden.status];
  const editable = EDITABLE_STATUSES.includes(orden.status);
  const recibible = RECEIVABLE_STATUSES.includes(orden.status);
  const conflicto = conflictoDeTransicion(cambiarEstado.error);

  if (editando) {
    return (
      <div className="space-y-8">
        <PageHeader
          title={`Editar compra #${orden.id}`}
          description="Solo se puede editar mientras está en borrador o solicitada."
        />
        <PurchaseForm
          compra={orden}
          guardando={editar.isPending}
          errorServidor={editar.error}
          alertaPct={orden.costIncreaseAlertPct}
          onSubmit={guardar}
          onCancel={() => setEditando(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Compra #${orden.id}`}
        description={`${orden.supplier.tradeName ?? orden.supplier.legalName} · ${formatDate(orden.orderDate)}`}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <PurchaseStatusBadge status={orden.status} />
            <Link to="/compras" className="text-sm font-medium text-stone-500 hover:text-stone-800">
              Volver
            </Link>
          </div>
        }
      />

      {cambiarEstado.error !== null && (
        <Alert tone="danger" title="No se pudo cambiar el estado">
          {conflicto !== null
            ? `Desde «${PURCHASE_STATUS_LABEL[conflicto.from]}» solo se puede pasar a ` +
              `${conflicto.allowed.map((e) => `«${PURCHASE_STATUS_LABEL[e]}»`).join(" o ") || "ningún estado"}.`
            : getApiErrorMessage(cambiarEstado.error)}
        </Alert>
      )}

      {/* Acciones: solo las transiciones que el backend acepta */}
      <Card className="flex flex-wrap items-center gap-3">
        <Can permission={PERMISSIONS.PURCHASES_MANAGE}>
          {editable && (
            <Button variant="secondary" onClick={() => setEditando(true)}>
              Editar orden
            </Button>
          )}
          {transiciones.map((destino) => (
            <Button
              key={destino}
              variant={destino === "CANCELLED" ? "secondary" : "primary"}
              className={destino === "CANCELLED" ? "text-red-600 ring-red-200" : undefined}
              onClick={() => setTransicionPendiente(destino)}
              loading={cambiarEstado.isPending && transicionPendiente === destino}
            >
              {ACCION[destino]}
            </Button>
          ))}
        </Can>

        <Can permission={PERMISSIONS.PURCHASES_RECEIVE}>
          {recibible && <Button onClick={() => setRecibiendo(true)}>Recibir mercadería</Button>}
        </Can>

        {transiciones.length === 0 && !recibible && (
          <p className="text-sm text-stone-500">
            La orden está {PURCHASE_STATUS_LABEL[orden.status].toLowerCase()}: no admite más cambios.
          </p>
        )}
      </Card>

      {/* Ítems */}
      <Card flush>
        <div className="p-6 sm:p-8">
          <CardHeader
            title="Productos de la orden"
            description={`Alerta de suba de costo por encima del ${orden.costIncreaseAlertPct} %.`}
          />
        </div>

        <Table>
          <THead>
            <TR>
              <TH>Producto</TH>
              <TH align="right">Pedido</TH>
              <TH align="right">Recibido</TH>
              <TH align="right">Costo unit.</TH>
              <TH align="right">Costo anterior</TH>
              <TH align="right">Subtotal</TH>
            </TR>
          </THead>
          <TBody>
            {orden.items.map((item) => {
              const cantidad = toNumber(item.quantity);
              const recibido = toNumber(item.receivedQty);
              const completo = recibido >= cantidad;

              return (
                <TR key={item.id}>
                  <TD>
                    <span className="font-medium text-stone-900">{item.product.name}</span>
                    <span className="block font-mono text-xs text-stone-500">
                      {item.product.sku}
                    </span>
                  </TD>
                  <TD align="right" numeric>
                    {formatQuantity(item.quantity)}
                  </TD>
                  <TD align="right" numeric>
                    <span className={completo ? "text-emerald-700" : "text-amber-700"}>
                      {formatQuantity(item.receivedQty)}
                    </span>
                  </TD>
                  <TD align="right" numeric>
                    {formatMoney(item.unitCost)}
                  </TD>
                  <TD align="right" numeric className="text-stone-500">
                    {item.previousCost === null || toNumber(item.previousCost) === 0 ? (
                      "—"
                    ) : (
                      <span className="flex items-center justify-end gap-2">
                        {formatMoney(item.previousCost)}
                        {item.costIncreaseAlert !== null && (
                          <Badge tone="warning">+{item.costIncreaseAlert.toFixed(1)} %</Badge>
                        )}
                      </span>
                    )}
                  </TD>
                  <TD align="right" numeric className="font-medium text-stone-900">
                    {formatMoney(cantidad * toNumber(item.unitCost))}
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>

        <dl className="space-y-2 border-t border-stone-200 px-6 py-5 text-sm sm:px-8">
          <div className="flex justify-between text-stone-500">
            <dt>Subtotal</dt>
            <dd className="tabular">{formatMoney(orden.subtotal)}</dd>
          </div>
          {toNumber(orden.discount) > 0 && (
            <div className="flex justify-between text-stone-500">
              <dt>Descuento</dt>
              <dd className="tabular">− {formatMoney(orden.discount)}</dd>
            </div>
          )}
          {toNumber(orden.freightCost) > 0 && (
            <div className="flex justify-between text-stone-500">
              <dt>Flete</dt>
              <dd className="tabular">{formatMoney(orden.freightCost)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-stone-100 pt-2">
            <dt className="font-medium text-stone-700">Total</dt>
            <dd className="tabular text-lg font-semibold text-stone-900">
              {formatMoney(orden.total)}
            </dd>
          </div>
        </dl>
      </Card>

      {/* Recepciones ya hechas: vienen dentro del detalle */}
      <Card flush>
        <div className="p-6 sm:p-8">
          <CardHeader
            title="Recepciones"
            description="Cada recepción genera lotes de stock y actualiza los costos."
          />
        </div>

        {orden.receipts.length === 0 ? (
          <EmptyState
            title="Todavía no se recibió nada"
            description="Cuando llegue la mercadería, registrala para que entre al stock."
          />
        ) : (
          <ul className="divide-y divide-stone-100 border-t border-stone-100">
            {orden.receipts.map((recepcion) => (
              <li key={recepcion.id} className="flex items-center justify-between gap-4 px-6 py-4 sm:px-8">
                <span>
                  <span className="font-medium text-stone-900">Recepción #{recepcion.id}</span>
                  <span className="block text-sm text-stone-500">
                    {formatDateTime(recepcion.receivedAt)} ·{" "}
                    {recepcion.items.length} {recepcion.items.length === 1 ? "línea" : "líneas"}
                  </span>
                </span>
                <span className="tabular text-sm text-stone-500">
                  {formatQuantity(
                    recepcion.items.reduce((suma, i) => suma + toNumber(i.quantity), 0)
                  )}{" "}
                  unidades
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ConfirmDialog
        open={transicionPendiente !== null}
        title={
          transicionPendiente === "CANCELLED"
            ? `¿Cancelar la orden #${orden.id}?`
            : `¿Pasar la orden a «${transicionPendiente !== null ? PURCHASE_STATUS_LABEL[transicionPendiente] : ""}»?`
        }
        description={
          transicionPendiente === "CANCELLED"
            ? "Una orden cancelada no vuelve atrás."
            : "El cambio de estado queda registrado en la auditoría."
        }
        confirmLabel={transicionPendiente === "CANCELLED" ? "Cancelar orden" : "Confirmar"}
        cancelLabel="Volver"
        tone={transicionPendiente === "CANCELLED" ? "danger" : "primary"}
        loading={cambiarEstado.isPending}
        onCancel={() => setTransicionPendiente(null)}
        onConfirm={() => {
          if (transicionPendiente === null) return;
          cambiarEstado.mutate(transicionPendiente, {
            onSettled: () => setTransicionPendiente(null),
          });
        }}
      />

      {recibiendo && (
        <ReceiveDialog open compra={orden} onClose={() => setRecibiendo(false)} />
      )}
    </div>
  );
}
