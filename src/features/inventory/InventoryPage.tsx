import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  Card,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  Spinner,
  Table,
  TableMessage,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import { PERMISSIONS, useAuth } from "@/features/auth";
import { flattenCategories, useCategoryTree } from "@/features/products/api";
import { getApiErrorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatMoney, formatQuantity } from "@/lib/format";
import { useDebouncedValue, useDocumentTitle } from "@/lib/hooks";
import { useInventoryOverview } from "./api";
import type { InventoryRow, OverviewQuery, StockFilter } from "./types";

const PAGE_SIZE = 20;

/** Estado del producto, priorizando lo que hay que resolver primero. */
function EstadoDeStock({ fila }: { fila: InventoryRow }) {
  if (fila.isNegative || fila.hasOversoldBatch) return <Badge tone="danger">Sobrevendido</Badge>;
  if (fila.available <= 0) return <Badge tone="neutral">Sin stock</Badge>;
  if (fila.isBelowMin) return <Badge tone="warning">Bajo mínimo</Badge>;
  return <Badge tone="success">En stock</Badge>;
}

/**
 * Inventario: dónde está parado el stock hoy.
 *
 * Lo urgente son los sobrevendidos (disponible en negativo), así que
 * tienen atajo propio y se marcan en rojo. Los costos solo aparecen con
 * `products.view_cost` — el backend directamente no los manda sin ese
 * permiso.
 */
export function InventoryPage() {
  useDocumentTitle("Inventario");

  const navigate = useNavigate();
  const { can } = useAuth();
  const verCostos = can(PERMISSIONS.PRODUCTS_VIEW_COST);

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [stock, setStock] = useState<StockFilter | "">("");
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(search);

  // Cualquier cambio de filtro devuelve a la primera página
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryId, stock]);

  const query = useMemo<OverviewQuery>(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      ...(debouncedSearch.trim() !== "" ? { search: debouncedSearch.trim() } : {}),
      ...(categoryId !== "" ? { categoryId } : {}),
      ...(stock !== "" ? { stock } : {}),
    }),
    [page, debouncedSearch, categoryId, stock]
  );

  const { data, isPending, isFetching, error } = useInventoryOverview(query);

  // Las categorías se leen con products.view: sin ese permiso no se pide
  const puedeVerCategorias = can(PERMISSIONS.PRODUCTS_VIEW);
  const categories = useCategoryTree(puedeVerCategorias);
  const categoryOptions = flattenCategories(categories.data);

  const soloSobrevendidos = stock === "negative";
  const columnCount = verCostos ? 7 : 5;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Inventario"
        description="Stock disponible por producto, con sus lotes y movimientos."
        actions={
          <Button
            variant={soloSobrevendidos ? "danger" : "secondary"}
            aria-pressed={soloSobrevendidos}
            onClick={() => setStock(soloSobrevendidos ? "" : "negative")}
          >
            {soloSobrevendidos ? "Ver todo el inventario" : "Solo sobrevendidos"}
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SearchInput
          placeholder="Nombre, SKU o código interno…"
          aria-label="Buscar productos"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        {puedeVerCategorias && (
          <Select
            aria-label="Filtrar por categoría"
            value={categoryId}
            onChange={(event) =>
              setCategoryId(event.target.value === "" ? "" : Number(event.target.value))
            }
            disabled={categories.isPending}
          >
            <option value="">Todas las categorías</option>
            {categoryOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        )}

        <Select
          aria-label="Filtrar por estado de stock"
          value={stock}
          onChange={(event) => setStock(event.target.value as StockFilter | "")}
        >
          <option value="">Todo el inventario</option>
          <option value="with_stock">Con stock</option>
          <option value="without_stock">Sin stock (incluye sobrevendidos)</option>
          <option value="negative">Solo sobrevendidos</option>
        </Select>
      </div>

      {soloSobrevendidos && (
        <Alert tone="warning" title="Estás viendo solo los productos sobrevendidos">
          Son los que quedaron con disponible en negativo: se vendieron más de los que había.
          Entrá a cada uno para regularizarlos cargando la mercadería que falta.
        </Alert>
      )}

      {error !== null && (
        <Alert tone="danger" title="No se pudo cargar el inventario">
          {getApiErrorMessage(error)}
        </Alert>
      )}

      <Card flush>
        <Table>
          <THead>
            <TR>
              <TH>SKU</TH>
              <TH>Producto</TH>
              <TH align="right">Disponible</TH>
              <TH align="right">Lotes</TH>
              {verCostos && <TH align="right">Costo prom.</TH>}
              {verCostos && <TH align="right">Valorizado</TH>}
              <TH align="right">Estado</TH>
            </TR>
          </THead>

          <TBody>
            {isPending ? (
              <TableMessage colSpan={columnCount}>
                <Spinner />
              </TableMessage>
            ) : data === undefined || data.items.length === 0 ? (
              <TableMessage colSpan={columnCount}>
                {soloSobrevendidos
                  ? "No hay productos sobrevendidos. Todo el stock está en cero o en positivo."
                  : "No hay productos que coincidan con los filtros."}
              </TableMessage>
            ) : (
              data.items.map((fila) => (
                <TR key={fila.id} interactive onClick={() => navigate(`/inventario/${fila.id}`)}>
                  <TD className="font-mono text-xs text-stone-500">{fila.sku}</TD>

                  <TD>
                    <span className="font-medium text-stone-900">{fila.name}</span>
                    <span className="block text-xs text-stone-400">{fila.unit}</span>
                  </TD>

                  <TD align="right" numeric>
                    <span
                      className={cn(
                        "font-medium",
                        fila.isNegative
                          ? "text-red-600"
                          : fila.isBelowMin
                            ? "text-amber-700"
                            : "text-stone-900"
                      )}
                    >
                      {formatQuantity(fila.available)}
                    </span>
                    {fila.minStock !== null && (
                      <span className="block text-xs text-stone-400">
                        mín. {formatQuantity(fila.minStock)}
                      </span>
                    )}
                  </TD>

                  <TD align="right" numeric className="text-stone-600">
                    {formatQuantity(fila.batches)}
                  </TD>

                  {verCostos && (
                    <TD align="right" numeric className="text-stone-600">
                      {formatMoney(fila.averageCost)}
                    </TD>
                  )}

                  {verCostos && (
                    <TD align="right" numeric className="text-stone-600">
                      {formatMoney(fila.stockValue)}
                    </TD>
                  )}

                  <TD align="right">
                    <EstadoDeStock fila={fila} />
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>

        {data !== undefined && (
          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onPageChange={setPage}
          />
        )}
      </Card>

      {/*
        El backend no devuelve la categoría de cada producto en esta vista
        (solo permite filtrar por ella), así que no hay columna de
        categoría: mostrarla implicaría pedir el catálogo aparte.
      */}
      <p className="text-sm text-stone-400">
        El disponible descuenta lo reservado. Tocá un producto para ver sus lotes y movimientos.
      </p>

      {isFetching && !isPending && (
        <p className="flex items-center gap-2 text-sm text-stone-400">
          <Spinner size="sm" /> Actualizando…
        </p>
      )}
    </div>
  );
}
