import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  LoadingBlock,
  PageHeader,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api";
import { formatDateTime, formatMoney, formatQuantityWithUnit, toNumber } from "@/lib/format";
import { useDocumentTitle } from "@/lib/hooks";
import { useCancelQuote, useQuote } from "./api";
import { QuoteStatusBadge } from "./QuoteStatusBadge";
import type { QuoteDetail } from "./types";

/** Items con sus precios congelados. Solo lectura. */
export function QuoteItemsTable({ quote }: { quote: QuoteDetail }) {
  return (
    <Table>
      <THead>
        <TR>
          <TH>Producto</TH>
          <TH align="right">Cantidad</TH>
          <TH align="right">Precio</TH>
          <TH align="right">Descuento</TH>
          <TH align="right">Subtotal</TH>
        </TR>
      </THead>
      <TBody>
        {quote.items.map((item) => (
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
            </TD>
            <TD align="right" numeric className="text-stone-500">
              {toNumber(item.discount) === 0 ? "—" : `− ${formatMoney(item.discount)}`}
            </TD>
            <TD align="right" numeric className="font-medium text-stone-900">
              {formatMoney(item.total)}
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

export function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const quoteId = Number(id);

  const navigate = useNavigate();
  const quote = useQuote(quoteId);
  const cancelar = useCancelQuote(quoteId);

  const [confirmarCancelar, setConfirmarCancelar] = useState(false);

  useDocumentTitle(quote.data === undefined ? "Presupuesto" : `Presupuesto ${quote.data.number}`);

  if (quote.isPending) return <LoadingBlock label="Cargando el presupuesto…" />;

  if (quote.error !== null || quote.data === undefined) {
    return (
      <div className="space-y-8">
        <PageHeader title="Presupuesto" />
        <Alert tone="danger" title="No se pudo cargar el presupuesto">
          {getApiErrorMessage(quote.error)}
        </Alert>
      </div>
    );
  }

  const q = quote.data;
  const vigente = q.status === "ACTIVE" && !q.isExpired;

  const dato = (etiqueta: string, valor: string) => (
    <div className="space-y-1">
      <dt className="text-sm text-stone-500">{etiqueta}</dt>
      <dd className="text-stone-800">{valor}</dd>
    </div>
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Presupuesto ${q.number}`}
        description={q.customer?.name ?? "Sin cliente"}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <QuoteStatusBadge status={q.status} isExpired={q.isExpired} />
            <Link
              to={`/presupuestos/${q.id}/comprobante`}
              target="_blank"
              className="text-sm font-medium text-stone-500 hover:text-stone-800"
            >
              Ver comprobante
            </Link>
            <Link
              to="/presupuestos"
              className="text-sm font-medium text-stone-500 hover:text-stone-800"
            >
              Volver
            </Link>
          </div>
        }
      />

      {q.isExpired && q.status === "ACTIVE" && (
        <Alert tone="warning" title="Este presupuesto está vencido">
          Venció el {formatDateTime(q.expiresAt)}. No se puede convertir en venta ni editar; hay que
          hacer uno nuevo con los precios de hoy. Cancelarlo sigue disponible.
        </Alert>
      )}

      {q.status === "CONVERTED" && (
        <Alert tone="success" title="Ya se convirtió en venta">
          Generó la venta #{q.saleId}. Un presupuesto convertido no se edita ni se vuelve a
          convertir.
        </Alert>
      )}

      {q.status === "CANCELLED" && (
        <Alert tone="info" title="Presupuesto cancelado">
          Queda como registro; no se puede convertir ni editar.
        </Alert>
      )}

      {cancelar.error !== null && (
        <Alert tone="danger" title="No se pudo cancelar">
          {getApiErrorMessage(cancelar.error)}
        </Alert>
      )}

      <Card className="space-y-6">
        <CardHeader title="Datos del presupuesto" />
        <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {dato("Cliente", q.customer?.name ?? "Sin cliente")}
          {dato("Fecha", formatDateTime(q.createdAt))}
          {dato("Vence", formatDateTime(q.expiresAt))}
          {dato("Lista de precios", q.priceList.name)}
          {dato("Sucursal", q.branch.name)}
          {dato("Hecho por", q.createdBy.fullName)}
        </dl>

        {q.notes !== null && (
          <div className="space-y-1 border-t border-stone-100 pt-5">
            <p className="text-sm text-stone-500">Notas</p>
            <p className="text-sm whitespace-pre-line text-stone-700">{q.notes}</p>
          </div>
        )}
      </Card>

      <Card flush>
        <div className="p-6 sm:p-8">
          <CardHeader
            title="Items"
            description="Los precios quedaron congelados al crear el presupuesto."
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

      {q.status === "ACTIVE" && (
        <div className="flex flex-wrap items-center gap-3 border-t border-stone-200 pt-6">
          {vigente && (
            <>
              <Button size="lg" onClick={() => navigate(`/presupuestos/${q.id}/convertir`)}>
                Convertir en venta
              </Button>
              <Button variant="secondary" onClick={() => navigate(`/presupuestos/${q.id}/editar`)}>
                Editar
              </Button>
            </>
          )}
          <Button
            variant="secondary"
            className="text-red-600 ring-red-200 hover:bg-red-50"
            onClick={() => setConfirmarCancelar(true)}
          >
            Cancelar presupuesto
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmarCancelar}
        title={`¿Cancelar el presupuesto ${q.number}?`}
        description="Queda como registro cancelado y no se va a poder convertir en venta."
        confirmLabel="Cancelar presupuesto"
        loading={cancelar.isPending}
        onCancel={() => setConfirmarCancelar(false)}
        onConfirm={() => cancelar.mutate(undefined, { onSuccess: () => setConfirmarCancelar(false) })}
      />
    </div>
  );
}
