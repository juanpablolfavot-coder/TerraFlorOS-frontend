import { useState, type FormEvent } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Input,
  LoadingBlock,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import { Can, PERMISSIONS, useAuth } from "@/features/auth";
import { useProducts } from "@/features/products/api";
import { getApiErrorMessage } from "@/lib/api";
import { formatDate, formatMoney, formatQuantity } from "@/lib/format";
import { useDebouncedValue } from "@/lib/hooks";
import {
  useAddSupplierProduct,
  useRemoveSupplierProduct,
  useSupplierProducts,
  useUpdateSupplierProduct,
} from "./api";

/**
 * Catálogo del proveedor: cómo llama y presenta cada producto.
 *
 * `lastCost` y `lastCostDate` solo llegan con `products.view_cost`, así
 * que esas columnas aparecen únicamente si el usuario los puede ver.
 */
export function SupplierProductsCard({ supplierId }: { supplierId: number }) {
  const { can } = useAuth();
  const verCostos = can(PERMISSIONS.PRODUCTS_VIEW_COST);

  const catalogo = useSupplierProducts(supplierId);
  const agregar = useAddSupplierProduct(supplierId);
  const actualizar = useUpdateSupplierProduct(supplierId);
  const quitar = useRemoveSupplierProduct(supplierId);

  const [busqueda, setBusqueda] = useState("");
  const [presentacion, setPresentacion] = useState("");
  const [factor, setFactor] = useState("1");
  const [elegido, setElegido] = useState<{ id: number; name: string } | null>(null);

  const busquedaDebounced = useDebouncedValue(busqueda, 300);
  const resultados = useProducts({
    page: 1,
    pageSize: 6,
    isActive: true,
    sortBy: "name",
    sortDir: "asc",
    ...(busquedaDebounced.trim().length >= 2 ? { search: busquedaDebounced.trim() } : {}),
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (elegido === null) return;

    const conversion = Number(factor.replace(",", "."));
    agregar.mutate(
      {
        productId: elegido.id,
        presentation: presentacion.trim() === "" ? null : presentacion.trim(),
        conversionFactor: Number.isFinite(conversion) && conversion > 0 ? conversion : 1,
      },
      {
        onSuccess: () => {
          setElegido(null);
          setBusqueda("");
          setPresentacion("");
          setFactor("1");
        },
      }
    );
  };

  return (
    <Card flush>
      <div className="p-6 sm:p-8">
        <CardHeader
          title="Catálogo del proveedor"
          description="Cómo llama y presenta este proveedor a cada producto."
        />
      </div>

      {catalogo.isPending ? (
        <LoadingBlock label="Cargando el catálogo…" />
      ) : catalogo.error !== null ? (
        <Alert tone="danger" className="mx-6 mb-6">
          {getApiErrorMessage(catalogo.error)}
        </Alert>
      ) : (catalogo.data ?? []).length === 0 ? (
        <EmptyState
          title="Sin productos cargados"
          description="Podés asociar los productos que provee, con su presentación y equivalencia."
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Producto</TH>
              <TH>Presentación</TH>
              <TH align="right">Equivale a</TH>
              {verCostos && <TH align="right">Último costo</TH>}
              {verCostos && <TH align="right">Fecha</TH>}
              <TH align="right">Preferido</TH>
              <TH align="right">
                <span className="sr-only">Acciones</span>
              </TH>
            </TR>
          </THead>
          <TBody>
            {(catalogo.data ?? []).map((sp) => (
              <TR key={sp.id}>
                <TD>
                  <span className="font-medium text-stone-900">{sp.product.name}</span>
                  <span className="block font-mono text-xs text-stone-500">{sp.product.sku}</span>
                  {sp.supplierName !== null && (
                    <span className="block text-xs text-stone-400">
                      El proveedor lo llama «{sp.supplierName}»
                    </span>
                  )}
                </TD>

                <TD className="text-stone-600">{sp.presentation ?? "—"}</TD>

                <TD align="right" numeric className="text-stone-500">
                  {formatQuantity(sp.conversionFactor)} {sp.product.unit}
                </TD>

                {verCostos && (
                  <TD align="right" numeric>
                    {sp.lastCost == null ? "—" : formatMoney(sp.lastCost)}
                  </TD>
                )}
                {verCostos && (
                  <TD align="right" className="text-stone-500">
                    {sp.lastCostDate == null ? "—" : formatDate(sp.lastCostDate)}
                  </TD>
                )}

                <TD align="right">
                  {sp.isPreferred ? (
                    <Badge tone="brand">Preferido</Badge>
                  ) : (
                    <Can permission={PERMISSIONS.SUPPLIERS_MANAGE}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          actualizar.mutate({ spId: sp.id, isPreferred: true })
                        }
                        disabled={actualizar.isPending}
                      >
                        Marcar
                      </Button>
                    </Can>
                  )}
                </TD>

                <TD align="right">
                  <Can permission={PERMISSIONS.SUPPLIERS_MANAGE}>
                    <button
                      type="button"
                      aria-label={`Quitar ${sp.product.name} del catálogo`}
                      onClick={() => quitar.mutate(sp.id)}
                      disabled={quitar.isPending}
                      className="rounded-md p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.6}
                        strokeLinecap="round"
                        className="size-4"
                        aria-hidden="true"
                      >
                        <path d="m6 6 12 12M18 6 6 18" />
                      </svg>
                    </button>
                  </Can>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <Can permission={PERMISSIONS.SUPPLIERS_MANAGE}>
        <form
          className="space-y-4 border-t border-stone-200 p-6 sm:p-8"
          onSubmit={handleSubmit}
        >
          <p className="text-sm font-medium text-stone-700">Agregar un producto</p>

          {elegido === null ? (
            <>
              <Input
                aria-label="Buscar producto para el catálogo"
                placeholder="Buscar por nombre o SKU…"
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
              />

              {busquedaDebounced.trim().length >= 2 && (
                <div className="overflow-hidden rounded-lg border border-stone-200">
                  {(resultados.data?.items ?? []).length === 0 ? (
                    <p className="px-4 py-4 text-center text-sm text-stone-500">
                      Ningún producto coincide.
                    </p>
                  ) : (
                    <ul className="divide-y divide-stone-100">
                      {(resultados.data?.items ?? []).map((producto) => (
                        <li key={producto.id}>
                          <button
                            type="button"
                            onClick={() => setElegido({ id: producto.id, name: producto.name })}
                            className="flex w-full items-center justify-between gap-4 px-4 py-2.5 text-left hover:bg-stone-50"
                          >
                            <span className="text-sm text-stone-800">{producto.name}</span>
                            <span className="font-mono text-xs text-stone-500">{producto.sku}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="grid items-end gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <span className="block text-sm font-medium text-stone-700">Producto</span>
                <p className="flex h-11 items-center gap-2 rounded-lg bg-stone-50 px-3.5 text-sm">
                  {elegido.name}
                  <button
                    type="button"
                    className="text-xs text-stone-500 underline"
                    onClick={() => setElegido(null)}
                  >
                    cambiar
                  </button>
                </p>
              </div>

              <Input
                label="Presentación"
                placeholder="Ej: bandeja x12"
                value={presentacion}
                onChange={(event) => setPresentacion(event.target.value)}
                hint="Distingue dos entradas del mismo producto."
              />

              <Input
                label="Equivale a"
                inputMode="decimal"
                value={factor}
                onChange={(event) => setFactor(event.target.value)}
                hint="Unidades base por unidad del proveedor."
              />
            </div>
          )}

          {agregar.error !== null && (
            <Alert tone="danger" title="No se pudo agregar">
              {getApiErrorMessage(agregar.error)}
            </Alert>
          )}
          {(actualizar.error !== null || quitar.error !== null) && (
            <Alert tone="danger">
              {getApiErrorMessage(actualizar.error ?? quitar.error)}
            </Alert>
          )}

          <Button type="submit" loading={agregar.isPending} disabled={elegido === null}>
            Agregar al catálogo
          </Button>
        </form>
      </Can>
    </Card>
  );
}
