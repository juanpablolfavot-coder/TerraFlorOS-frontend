import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  LoadingBlock,
  PageHeader,
} from "@/components/ui";
import { Can, PERMISSIONS, useAuth } from "@/features/auth";
import { getApiErrorMessage, isApiError } from "@/lib/api";
import { useDocumentTitle } from "@/lib/hooks";
import { useCreateProduct, useDeleteProduct, useProduct, useUpdateProduct } from "./api";
import { ProductBarcodesCard } from "./ProductBarcodesCard";
import { ProductForm } from "./ProductForm";
import { ProductPricesCard } from "./ProductPricesCard";
import type { CreateProductBody } from "./types";

/** Detalle del 409 al borrar un producto con stock. */
function detalleDeStock(error: unknown): { batches: number; totalQty: number } | null {
  if (!isApiError(error)) return null;
  const details = error.response?.data?.error?.details;
  if (typeof details === "object" && details !== null && "batches" in details) {
    return details as { batches: number; totalQty: number };
  }
  return null;
}

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const esAlta = id === "nuevo";
  const productId = esAlta ? null : Number(id);

  const navigate = useNavigate();
  const { can } = useAuth();

  const producto = useProduct(productId);
  const crear = useCreateProduct();
  const editar = useUpdateProduct(productId ?? 0);
  const borrar = useDeleteProduct();

  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [errorBorrado, setErrorBorrado] = useState<string | null>(null);

  useDocumentTitle(esAlta ? "Nuevo producto" : (producto.data?.name ?? "Producto"));

  const guardar = (body: CreateProductBody) => {
    if (esAlta) {
      crear.mutate(body, {
        onSuccess: (creado) => navigate(`/productos/${creado.id}`, { replace: true }),
      });
    } else {
      // PATCH no acepta `kind`: el tipo del producto no se cambia
      const { kind: _kind, ...resto } = body;
      editar.mutate(resto);
    }
  };

  const eliminar = () => {
    if (productId === null) return;
    setErrorBorrado(null);

    borrar.mutate(productId, {
      onSuccess: () => navigate("/productos", { replace: true }),
      onError: (error) => {
        const stock = detalleDeStock(error);
        setErrorBorrado(
          stock !== null
            ? `No se puede dar de baja: el producto todavía tiene ${stock.totalQty} unidades en ` +
                `${stock.batches} lote(s). Primero hay que descargar el stock.`
            : getApiErrorMessage(error)
        );
        setConfirmarBorrado(false);
      },
    });
  };

  if (!esAlta && producto.isPending) return <LoadingBlock label="Cargando producto…" />;

  if (!esAlta && producto.error !== null) {
    return (
      <div className="space-y-8">
        <PageHeader title="Producto" />
        <Alert tone="danger" title="No se pudo cargar el producto">
          {getApiErrorMessage(producto.error)}
        </Alert>
        <Link to="/productos" className="text-sm text-brand-700 hover:text-brand-800">
          Volver al catálogo
        </Link>
      </div>
    );
  }

  const detalle = producto.data ?? null;
  const guardando = crear.isPending || editar.isPending;
  const errorServidor = esAlta ? crear.error : editar.error;

  return (
    <div className="space-y-8">
      <PageHeader
        title={esAlta ? "Nuevo producto" : (detalle?.name ?? "")}
        description={
          esAlta
            ? "Cargá los datos básicos; si es una planta se suma su ficha botánica."
            : `SKU ${detalle?.sku ?? ""}`
        }
        actions={
          <div className="flex items-center gap-3">
            {detalle !== null && (
              <>
                {detalle.kind === "PLANT" ? (
                  <Badge tone="brand">Planta</Badge>
                ) : (
                  <Badge>Convencional</Badge>
                )}
                {!detalle.isActive && <Badge tone="neutral">Inactivo</Badge>}
              </>
            )}
            <Link
              to="/productos"
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

      {/* Sin products.manage el formulario no se muestra: no habría dónde guardar */}
      <Can
        permission={PERMISSIONS.PRODUCTS_MANAGE}
        fallback={
          detalle !== null ? (
            <Alert tone="info" title="Vista de solo lectura">
              Editar el catálogo requiere el permiso{" "}
              <code className="font-mono">products.manage</code>.
            </Alert>
          ) : null
        }
      >
        <ProductForm
          key={detalle?.id ?? "nuevo"}
          producto={detalle}
          guardando={guardando}
          errorServidor={errorServidor}
          onSubmit={guardar}
          onCancel={() => navigate("/productos")}
        />
      </Can>

      {/* Precios y códigos solo existen sobre un producto ya creado */}
      {detalle !== null && (
        <>
          <ProductPricesCard producto={detalle} />
          <ProductBarcodesCard producto={detalle} />

          {can(PERMISSIONS.PRODUCTS_MANAGE) && (
            <div className="border-t border-stone-200 pt-6">
              <Button
                variant="secondary"
                className="text-red-600 ring-red-200 hover:bg-red-50"
                onClick={() => setConfirmarBorrado(true)}
              >
                Dar de baja el producto
              </Button>
              <p className="mt-2 text-sm text-stone-500">
                Baja lógica: se oculta del catálogo pero se conserva el historial.
              </p>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmarBorrado}
        title={`¿Dar de baja «${detalle?.name ?? ""}»?`}
        description="Deja de aparecer en el catálogo y en el punto de venta. No se puede si todavía tiene stock."
        confirmLabel="Dar de baja"
        loading={borrar.isPending}
        onCancel={() => setConfirmarBorrado(false)}
        onConfirm={eliminar}
      />
    </div>
  );
}
