import { useState } from "react";
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
} from "@/components/ui";
import { Can, PERMISSIONS, useAuth } from "@/features/auth";
import { getApiErrorMessage } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { useDocumentTitle } from "@/lib/hooks";
import { useCreateCustomer, useCustomer, useDeleteCustomer, useUpdateCustomer } from "./api";
import { CustomerAccountCard } from "./CustomerAccountCard";
import { CustomerAddressesCard } from "./CustomerAddressesCard";
import { CustomerForm } from "./CustomerForm";
import { CustomerSalesCard } from "./CustomerSalesCard";
import { SEGMENT_LABEL, type CreateCustomerBody } from "./types";

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const esAlta = id === "nuevo";
  const customerId = esAlta ? null : Number(id);

  const navigate = useNavigate();
  const { can } = useAuth();

  const cliente = useCustomer(customerId);
  const crear = useCreateCustomer();
  const editar = useUpdateCustomer(customerId ?? 0);
  const borrar = useDeleteCustomer();

  const [editando, setEditando] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [errorBorrado, setErrorBorrado] = useState<string | null>(null);

  useDocumentTitle(esAlta ? "Nuevo cliente" : (cliente.data?.name ?? "Cliente"));

  const guardar = (body: CreateCustomerBody) => {
    if (esAlta) {
      crear.mutate(body, {
        onSuccess: (creado) => navigate(`/clientes/${creado.id}`, { replace: true }),
      });
    } else {
      editar.mutate(body, { onSuccess: () => setEditando(false) });
    }
  };

  const eliminar = () => {
    if (customerId === null) return;
    setErrorBorrado(null);

    borrar.mutate(customerId, {
      onSuccess: () => navigate("/clientes", { replace: true }),
      onError: (error) => {
        setErrorBorrado(getApiErrorMessage(error));
        setConfirmarBorrado(false);
      },
    });
  };

  if (esAlta) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Nuevo cliente"
          description="Solo el nombre es obligatorio; el resto se puede completar después."
          actions={
            <Link to="/clientes" className="text-sm font-medium text-stone-500 hover:text-stone-800">
              Volver
            </Link>
          }
        />
        <CustomerForm
          cliente={null}
          guardando={crear.isPending}
          errorServidor={crear.error}
          onSubmit={guardar}
          onCancel={() => navigate("/clientes")}
        />
      </div>
    );
  }

  if (cliente.isPending) return <LoadingBlock label="Cargando cliente…" />;

  if (cliente.error !== null || cliente.data === undefined) {
    return (
      <div className="space-y-8">
        <PageHeader title="Cliente" />
        <Alert tone="danger" title="No se pudo cargar el cliente">
          {getApiErrorMessage(cliente.error)}
        </Alert>
      </div>
    );
  }

  const c = cliente.data;

  if (editando) {
    return (
      <div className="space-y-8">
        <PageHeader title={`Editar ${c.name}`} />
        <CustomerForm
          cliente={c}
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
        title={c.name}
        description={SEGMENT_LABEL[c.segment] ?? c.segment}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {c.isActive ? <Badge tone="success">Activo</Badge> : <Badge tone="neutral">Inactivo</Badge>}
            <Can permission={PERMISSIONS.CUSTOMERS_MANAGE}>
              <Button variant="secondary" onClick={() => setEditando(true)}>
                Editar
              </Button>
            </Can>
            <Link to="/clientes" className="text-sm font-medium text-stone-500 hover:text-stone-800">
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
        <CardHeader title="Datos del cliente" />
        <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {dato("CUIT", c.taxId)}
          {dato("Teléfono", c.phone)}
          {dato("WhatsApp", c.whatsapp)}
          {dato("Email", c.email)}
          {dato("Lista de precios", c.priceList?.name ?? null)}
          {dato(
            "Límite de crédito",
            c.account.creditLimit === null ? null : formatMoney(c.account.creditLimit)
          )}
        </dl>

        {c.notes !== null && (
          <div className="space-y-1 border-t border-stone-100 pt-5">
            <p className="text-sm text-stone-500">Notas</p>
            <p className="text-sm whitespace-pre-line text-stone-700">{c.notes}</p>
          </div>
        )}
      </Card>

      <CustomerAddressesCard customerId={c.id} direcciones={c.addresses} />

      <CustomerAccountCard customerId={c.id} creditLimit={c.account.creditLimit} />

      {/* Listar ventas exige sales.create: sin ese permiso se omite */}
      <Can permission={PERMISSIONS.SALES_CREATE}>
        <CustomerSalesCard customerId={c.id} />
      </Can>

      {can(PERMISSIONS.CUSTOMERS_MANAGE) && (
        <div className="border-t border-stone-200 pt-6">
          <Button
            variant="secondary"
            className="text-red-600 ring-red-200 hover:bg-red-50"
            onClick={() => setConfirmarBorrado(true)}
          >
            Dar de baja el cliente
          </Button>
          <p className="mt-2 text-sm text-stone-500">
            Baja lógica: deja de aparecer en el padrón y en el POS, pero se conserva el historial de
            ventas.
          </p>
        </div>
      )}

      <ConfirmDialog
        open={confirmarBorrado}
        title={`¿Dar de baja a «${c.name}»?`}
        description="Deja de aparecer para elegir en una venta. Las ventas ya hechas se conservan."
        confirmLabel="Dar de baja"
        loading={borrar.isPending}
        onCancel={() => setConfirmarBorrado(false)}
        onConfirm={eliminar}
      />
    </div>
  );
}
