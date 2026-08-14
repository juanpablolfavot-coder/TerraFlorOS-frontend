import { useEffect, useMemo, useState } from "react";
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
import { Can, PERMISSIONS, useAuth } from "@/features/auth";
import { getApiErrorMessage } from "@/lib/api";
import { formatMoney, formatQuantity } from "@/lib/format";
import { useDebouncedValue, useDocumentTitle } from "@/lib/hooks";
import { flattenCategories, useCategoryTree, useProducts } from "./api";
import type { ProductKind, ProductsQuery } from "./types";

const PAGE_SIZE = 20;

type ActiveFilter = "all" | "active" | "inactive";

export function ProductsPage() {
  useDocumentTitle("Productos");

  const { can } = useAuth();
  const showCost = can(PERMISSIONS.PRODUCTS_VIEW_COST);

  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<ProductKind | "">("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("active");
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(search);

  // Cualquier cambio de filtro devuelve a la primera página: quedarse en
  // la 7 de un listado que ahora tiene 2 mostraría una tabla vacía.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, kind, categoryId, activeFilter]);

  const query = useMemo<ProductsQuery>(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      sortBy: "name",
      sortDir: "asc",
      ...(debouncedSearch.trim() !== "" ? { search: debouncedSearch.trim() } : {}),
      ...(kind !== "" ? { kind } : {}),
      ...(categoryId !== "" ? { categoryId } : {}),
      ...(activeFilter !== "all" ? { isActive: activeFilter === "active" } : {}),
    }),
    [page, debouncedSearch, kind, categoryId, activeFilter]
  );

  const { data, isPending, isFetching, error } = useProducts(query);
  const categories = useCategoryTree();
  const categoryOptions = flattenCategories(categories.data);

  const columnCount = showCost ? 7 : 6;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Productos"
        description="Catálogo del vivero: plantas y productos convencionales."
        actions={
          <Can permission={PERMISSIONS.PRODUCTS_MANAGE}>
            <Button disabled title="Próximamente">
              Nuevo producto
            </Button>
          </Can>
        }
      />

      {/* Filtros */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SearchInput
          className="sm:col-span-2 xl:col-span-1"
          placeholder="Buscar por nombre, SKU o código…"
          aria-label="Buscar productos"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <Select
          aria-label="Filtrar por tipo"
          value={kind}
          onChange={(event) => setKind(event.target.value as ProductKind | "")}
        >
          <option value="">Todos los tipos</option>
          <option value="PLANT">Plantas</option>
          <option value="CONVENTIONAL">Convencionales</option>
        </Select>

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

        <Select
          aria-label="Filtrar por estado"
          value={activeFilter}
          onChange={(event) => setActiveFilter(event.target.value as ActiveFilter)}
        >
          <option value="active">Solo activos</option>
          <option value="inactive">Solo inactivos</option>
          <option value="all">Todos</option>
        </Select>
      </div>

      {error !== null && (
        <Alert tone="danger" title="No se pudieron cargar los productos">
          {getApiErrorMessage(error)}
        </Alert>
      )}

      <Card flush>
        <Table>
          <THead>
            <TR>
              <TH>SKU</TH>
              <TH>Producto</TH>
              <TH>Categoría</TH>
              <TH>Tipo</TH>
              {showCost && <TH align="right">Costo prom.</TH>}
              <TH align="right">Mínimo</TH>
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
                No hay productos que coincidan con los filtros.
              </TableMessage>
            ) : (
              data.items.map((product) => (
                <TR key={product.id}>
                  <TD className="font-mono text-xs text-stone-500">{product.sku}</TD>

                  <TD>
                    <span className="font-medium text-stone-900">{product.name}</span>
                    {product.plantDetail?.scientificName != null && (
                      <span className="block text-xs text-stone-500 italic">
                        {product.plantDetail.scientificName}
                      </span>
                    )}
                  </TD>

                  <TD className="text-stone-500">{product.category?.name ?? "—"}</TD>

                  <TD>
                    {product.kind === "PLANT" ? (
                      <Badge tone="brand">Planta</Badge>
                    ) : (
                      <Badge>Convencional</Badge>
                    )}
                  </TD>

                  {showCost && (
                    <TD align="right" numeric>
                      {formatMoney(product.averageCost)}
                    </TD>
                  )}

                  <TD align="right" numeric className="text-stone-500">
                    {product.minStock === null ? "—" : formatQuantity(product.minStock)}
                  </TD>

                  <TD align="right">
                    {product.isActive ? (
                      <Badge tone="success">Activo</Badge>
                    ) : (
                      <Badge tone="neutral">Inactivo</Badge>
                    )}
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

      {/* Señal discreta de recarga al cambiar de página o filtro */}
      {isFetching && !isPending && (
        <p className="flex items-center gap-2 text-sm text-stone-400">
          <Spinner size="sm" /> Actualizando…
        </p>
      )}
    </div>
  );
}
