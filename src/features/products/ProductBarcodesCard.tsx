import { useState, type FormEvent } from "react";
import { Alert, Button, Card, CardHeader, EmptyState, Input } from "@/components/ui";
import { Can, PERMISSIONS } from "@/features/auth";
import { getApiErrorMessage, isApiError } from "@/lib/api";
import { barcodeSchema } from "./schemas";
import { useAddBarcode, useRemoveBarcode } from "./api";
import type { ProductDetail } from "./types";

/** El 409 del backend trae el producto que ya tiene ese código. */
function otroProductoDelCodigo(error: unknown): number | null {
  if (!isApiError(error)) return null;
  const details = error.response?.data?.error?.details;
  if (typeof details === "object" && details !== null && "productId" in details) {
    const { productId } = details as { productId: unknown };
    return typeof productId === "number" ? productId : null;
  }
  return null;
}

export function ProductBarcodesCard({ producto }: { producto: ProductDetail }) {
  const agregar = useAddBarcode(producto.id);
  const quitar = useRemoveBarcode(producto.id);

  const [codigo, setCodigo] = useState("");
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validado = barcodeSchema.safeParse(codigo);
    if (!validado.success) {
      setErrorLocal(validado.error.issues[0]?.message ?? "Código inválido");
      return;
    }
    setErrorLocal(null);
    agregar.mutate(validado.data, { onSuccess: () => setCodigo("") });
  };

  const duplicadoEn = otroProductoDelCodigo(agregar.error);

  return (
    <Card className="space-y-6">
      <CardHeader
        title="Códigos de barras"
        description="Los usa el lector del punto de venta. Cada código es único en todo el catálogo."
      />

      {producto.barcodes.length === 0 ? (
        <EmptyState
          title="Sin códigos cargados"
          description="Se puede vender igual buscando por nombre o SKU."
        />
      ) : (
        <ul className="flex flex-wrap gap-2">
          {producto.barcodes.map((barcode) => (
            <li
              key={barcode.id}
              className="flex items-center gap-2 rounded-lg bg-stone-100 py-1.5 pr-1.5 pl-3"
            >
              <span className="font-mono text-sm text-stone-700">{barcode.barcode}</span>
              <Can permission={PERMISSIONS.PRODUCTS_MANAGE}>
                <button
                  type="button"
                  onClick={() => quitar.mutate(barcode.id)}
                  disabled={quitar.isPending}
                  aria-label={`Quitar el código ${barcode.barcode}`}
                  className="rounded-md p-1 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.7}
                    strokeLinecap="round"
                    className="size-3.5"
                    aria-hidden="true"
                  >
                    <path d="m6 6 12 12M18 6 6 18" />
                  </svg>
                </button>
              </Can>
            </li>
          ))}
        </ul>
      )}

      <Can permission={PERMISSIONS.PRODUCTS_MANAGE}>
        <form className="flex flex-wrap items-start gap-3" onSubmit={handleSubmit}>
          <div className="w-full sm:w-64">
            <Input
              aria-label="Nuevo código de barras"
              placeholder="Escaneá o escribí el código"
              value={codigo}
              onChange={(event) => {
                setCodigo(event.target.value);
                setErrorLocal(null);
              }}
              error={errorLocal ?? undefined}
            />
          </div>
          <Button type="submit" loading={agregar.isPending} disabled={codigo.trim() === ""}>
            Agregar código
          </Button>
        </form>

        {agregar.error !== null && (
          <Alert tone="danger" title="No se pudo agregar el código">
            {duplicadoEn !== null
              ? `Ese código ya está asignado al producto #${duplicadoEn}. Los códigos no se pueden repetir entre productos.`
              : getApiErrorMessage(agregar.error)}
          </Alert>
        )}

        {quitar.error !== null && (
          <Alert tone="danger" title="No se pudo quitar el código">
            {getApiErrorMessage(quitar.error)}
          </Alert>
        )}
      </Can>
    </Card>
  );
}
