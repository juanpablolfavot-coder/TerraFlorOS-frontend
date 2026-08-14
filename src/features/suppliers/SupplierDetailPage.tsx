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
import { Can, PERMISSIONS, useAuth } from "@/features/auth";
import { usePurchases } from "@/features/purchases/api";
import { PurchaseStatusBadge } from "@/features/purchases/PurchaseStatusBadge";
import { getApiErrorMessage } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { useDocumentTitle } from "@/lib/hooks";
import {
  conflictoDeCompras,
  useCreateSupplier,
  useDeleteSupplier,
  useSupplier,
  useUpdateSupplier,
} from "./api";
import { SupplierForm } from "./SupplierForm";
import { SupplierProductsCard } from "./SupplierProductsCard";
import type { CreateSupplierBody } from "./types";

/** Compras del proveedor. Las que están en borrador son los presupuestos. */
function ComprasDelProveedor({ supplierId }: { supplierId: number }) {
  const navigate = useNavigate();
  const compras = usePurchases({ supplierId, pageSize: 20 });

  return (
    <Card flush>
      <div className="p-6 sm:p-8">
        <CardHeader
          title="Compras de este proveedor"
          description="Las que están en borrador son los presupuestos todavía sin confirmar."
        />
      </div>

      {compras.isPending ? (
        <LoadingBlock label="Cargando compras…" />
      ) : compras.error !== null ? (
        <Alert tone="danger" className="mx-6 mb-6">
          {getApiErrorMessage(compras.error)}
        </Alert>
      ) : (compras.data?.items.length ?? 0) === 0 ? (
        <EmptyState
          title="Todavía no hay compras a este proveedor"
          description="Cuando cargues una orden va a aparecer acá."
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Orden</TH>
              <TH>Fecha</TH>
              <TH>Estado</TH>
              <TH align="right">Total</TH>
            </TR>
          </THead>
          <TBody>
            {(compras.data?.items ?? []).map((compra) => (
              <TR
                key={compra.id}
                interactive
                onClick={() => navigate(`/compras/${compra.id}`)}
              >
                <TD className="font-mono text-xs text-stone-500">#{compra.id}</TD>
                <TD className="text-stone-600">{formatDate(compra.orderDate)}</TD>
                <TD>
                  <PurchaseStatusBadge status={compra.status} />
                </TD>
                <TD align="right" numeric className="font-medium text-stone-900">
                  {formatMoney(compra.total)}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </Card>
  );
}

export function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const esAlta = id === "nuevo";
  const supplierId = esAlta ? null : Number(id);

  const navigate = useNavigate();
  const { can } = useAuth();

  const proveedor = useSupplier(supplierId);
  const crear = useCreateSupplier();
  const editar = useUpdateSupplier(supplierId ?? 0);
  const borrar = useDeleteSupplier();

  const [editando, setEditando] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [errorBorrado, setErrorBorrado] = useState<string | null>(null);

  useDocumentTitle(esAlta ? "Nuevo proveedor" : (proveedor.data?.legalName ?? "Proveedor"));

  const guardar = (body: CreateSupplierBody) => {
    if (esAlta) {
      crear.mutate(body, {
        onSuccess: (creado) => navigate(`/proveedores/${creado.id}`, { replace: true }),
      });
    } else {
      editar.mutate(body, { onSuccess: () => setEditando(false) });
    }
  };

  const eliminar = () => {
    if (supplierId === null) return;
    setErrorBorrado(null);

    borrar.mutate(supplierId, {
      onSuccess: () => navigate("/proveedores", { replace: true }),
      onError: (error) => {
        const conflicto = conflictoDeCompras(error);
        setErrorBorrado(
          conflicto !== null
            ? `No se puede dar de baja: tiene ${conflicto.openPurchases} compra(s) sin finalizar. ` +
                "Primero hay que recibirlas o cancelarlas."
            : getApiErrorMessage(error)
        );
        setConfirmarBorrado(false);
      },
    });
  };

  if (esAlta) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Nuevo proveedor"
          description="Solo la razón social es obligatoria; el resto se puede completar después."
          actions={
            <Link
              to="/proveedores"
              className="text-sm font-medium text-stone-500 hover:text-stone-800"
            >
              Volver
            </Link>
          }
        />
        <SupplierForm
          proveedor={null}
          guardando={crear.isPending}
          errorServidor={crear.error}
          onSubmit={guardar}
          onCancel={() => navigate("/proveedores")}
        />
      </div>
    );
  }

  if (proveedor.isPending) return <LoadingBlock label="Cargando proveedor…" />;

  if (proveedor.error !== null || proveedor.data === undefined) {
    return (
      <div className="space-y-8">
        <PageHeader title="Proveedor" />
        <Alert tone="danger" title="No se pudo cargar el proveedor">
          {getApiErrorMessage(proveedor.error)}
        </Alert>
      </div>
    );
  }

  const p = proveedor.data;

  if (editando) {
    return (
      <div className="space-y-8">
        <PageHeader title={`Editar ${p.tradeName ?? p.legalName}`} />
        <SupplierForm
          proveedor={p}
          guardando={editar.isPending}
          errorServidor={editar.error}
          onSubmit={guardar}
          onCancel={() => setEditando(false)}
        />
      </div>
    );
  }

  const dato = (etiqueta: string, valor: string | null) => (
    <div className="space-y-1">
      <dt className="text-sm text-stone-500">{etiqueta}</dt>
      <dd className="text-stone-800">{valor ?? "—"}</dd>
    </div>
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title={p.tradeName ?? p.legalName}
        description={p.tradeName !== null ? p.legalName : undefined}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {p.isActive ? (
              <Badge tone="success">Activo</Badge>
            ) : (
              <Badge tone="neutral">Inactivo</Badge>
            )}
            <Can permission={PERMISSIONS.SUPPLIERS_MANAGE}>
              <Button variant="secondary" onClick={() => setEditando(true)}>
                Editar
              </Button>
            </Can>
            <Link
              to="/proveedores"
              className="text-sm font-medium text-stone-500 hover:text-stone-800"
            >
              Volver
            </Link>
          </div>
        }
      />

      {errorBorrado !== null && (
        <Alert tone="danger" title="No se pudo dar de baja">
          {errorBorrado}
        </Alert>
      )}

      <Card className="space-y-6">
        <CardHeader title="Datos del proveedor" />
        <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {dato("CUIT", p.taxId)}
          {dato("Contacto", p.contactName)}
          {dato("Teléfono", p.phone)}
          {dato("WhatsApp", p.whatsapp)}
          {dato("Email", p.email)}
          {dato("Dirección", p.address)}
          {dato("Días de entrega", p.deliveryDays)}
          {dato(
            "Mínimo de compra",
            p.minOrderAmount == null ? null : formatMoney(p.minOrderAmount)
          )}
          {dato("Condiciones de pago", p.paymentTerms)}
        </dl>

        {p.notes !== null && (
          <div className="space-y-1 border-t border-stone-100 pt-5">
            <p className="text-sm text-stone-500">Notas</p>
            <p className="text-sm whitespace-pre-line text-stone-700">{p.notes}</p>
          </div>
        )}
      </Card>

      <SupplierProductsCard supplierId={p.id} />

      {/* Ver compras exige purchases.manage: sin ese permiso se omite */}
      <Can permission={PERMISSIONS.PURCHASES_MANAGE}>
        <ComprasDelProveedor supplierId={p.id} />
      </Can>

      {can(PERMISSIONS.SUPPLIERS_MANAGE) && (
        <div className="border-t border-stone-200 pt-6">
          <Button
            variant="secondary"
            className="text-red-600 ring-red-200 hover:bg-red-50"
            onClick={() => setConfirmarBorrado(true)}
          >
            Dar de baja el proveedor
          </Button>
          <p className="mt-2 text-sm text-stone-500">
            Baja lógica: deja de ofrecerse en compras nuevas, pero se conserva el historial.
          </p>
        </div>
      )}

      <ConfirmDialog
        open={confirmarBorrado}
        title={`¿Dar de baja «${p.tradeName ?? p.legalName}»?`}
        description="No se puede si todavía tiene compras sin finalizar."
        confirmLabel="Dar de baja"
        loading={borrar.isPending}
        onCancel={() => setConfirmarBorrado(false)}
        onConfirm={eliminar}
      />
    </div>
  );
}
