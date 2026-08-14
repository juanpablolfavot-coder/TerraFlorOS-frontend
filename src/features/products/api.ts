import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  CategoryNode,
  CreateProductBody,
  Paginated,
  PriceHistoryEntry,
  ProductDetail,
  ProductListItem,
  ProductPriceRow,
  ProductsQuery,
  PutPricesBody,
  SupplierOption,
  UpdateProductBody,
} from "./types";

export const productKeys = {
  all: ["products"] as const,
  list: (query: ProductsQuery) => ["products", "list", query] as const,
  detail: (id: number) => ["products", "detail", id] as const,
};

export const categoryKeys = {
  tree: ["categories", "tree"] as const,
};

export function useProducts(query: ProductsQuery) {
  return useQuery({
    queryKey: productKeys.list(query),
    queryFn: async () => {
      const { data } = await api.get<Paginated<ProductListItem>>("/api/products", {
        params: query,
      });
      return data;
    },
    // Al cambiar de página o de filtro se mantiene la tabla anterior en
    // pantalla en vez de parpadear a vacío.
    placeholderData: keepPreviousData,
  });
}

export function useCategoryTree() {
  return useQuery({
    queryKey: categoryKeys.tree,
    queryFn: async () => {
      const { data } = await api.get<CategoryNode[]>("/api/categories");
      return data;
    },
    // Las categorías casi no cambian.
    staleTime: 5 * 60_000,
  });
}

/** Aplana el árbol de categorías para un `<select>`, sangrando las hijas. */
export function flattenCategories(
  nodes: CategoryNode[] | undefined
): Array<{ id: number; label: string }> {
  if (nodes === undefined) return [];

  const flat: Array<{ id: number; label: string }> = [];
  for (const node of nodes) {
    flat.push({ id: node.id, label: node.name });
    for (const child of node.children) {
      flat.push({ id: child.id, label: `— ${child.name}` });
    }
  }
  return flat;
}

// ---------------------------------------------------------------
// Detalle, alta, edición y baja
// ---------------------------------------------------------------

export function useProduct(id: number | null) {
  return useQuery({
    queryKey: id === null ? ["products", "detail", "nuevo"] : productKeys.detail(id),
    enabled: id !== null,
    queryFn: async () => {
      const { data } = await api.get<ProductDetail>(`/api/products/${id}`);
      return data;
    },
  });
}

/** Invalida todo lo que depende del catálogo tras una escritura. */
function useInvalidarProductos() {
  const queryClient = useQueryClient();
  return (id?: number) => {
    void queryClient.invalidateQueries({ queryKey: productKeys.all });
    if (id !== undefined) void queryClient.invalidateQueries({ queryKey: productKeys.detail(id) });
  };
}

export function useCreateProduct() {
  const invalidar = useInvalidarProductos();

  return useMutation({
    mutationFn: async (body: CreateProductBody) => {
      const { data } = await api.post<ProductDetail>("/api/products", body);
      return data;
    },
    onSuccess: (producto) => invalidar(producto.id),
  });
}

export function useUpdateProduct(id: number) {
  const invalidar = useInvalidarProductos();

  return useMutation({
    mutationFn: async (body: UpdateProductBody) => {
      const { data } = await api.patch<ProductDetail>(`/api/products/${id}`, body);
      return data;
    },
    onSuccess: () => invalidar(id),
  });
}

/** Baja lógica. 409 si el producto todavía tiene stock. */
export function useDeleteProduct() {
  const invalidar = useInvalidarProductos();

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/products/${id}`);
      return id;
    },
    onSuccess: (id) => invalidar(id),
  });
}

// ---------------------------------------------------------------
// Códigos de barras
// ---------------------------------------------------------------

/** Alta de código. 409 si ya está asignado a otro producto. */
export function useAddBarcode(productId: number) {
  const invalidar = useInvalidarProductos();

  return useMutation({
    mutationFn: async (barcode: string) => {
      const { data } = await api.post(`/api/products/${productId}/barcodes`, { barcode });
      return data;
    },
    onSuccess: () => invalidar(productId),
  });
}

export function useRemoveBarcode(productId: number) {
  const invalidar = useInvalidarProductos();

  return useMutation({
    mutationFn: async (barcodeId: number) => {
      await api.delete(`/api/products/${productId}/barcodes/${barcodeId}`);
    },
    onSuccess: () => invalidar(productId),
  });
}

// ---------------------------------------------------------------
// Precios
// ---------------------------------------------------------------

/** PUT reemplaza los precios indicados y deja rastro en el historial. */
export function useSavePrices(productId: number) {
  const invalidar = useInvalidarProductos();

  return useMutation({
    mutationFn: async (body: PutPricesBody) => {
      const { data } = await api.put<ProductPriceRow[]>(
        `/api/products/${productId}/prices`,
        body
      );
      return data;
    },
    onSuccess: () => invalidar(productId),
  });
}

export function usePriceHistory(productId: number, priceListId: number | null, enabled = true) {
  return useQuery({
    queryKey: ["products", "price-history", productId, priceListId],
    enabled,
    queryFn: async () => {
      const { data } = await api.get<Paginated<PriceHistoryEntry>>(
        `/api/products/${productId}/price-history`,
        { params: { pageSize: 20, ...(priceListId !== null ? { priceListId } : {}) } }
      );
      return data;
    },
  });
}

// ---------------------------------------------------------------
// Proveedores (solo para el selector del formulario)
// ---------------------------------------------------------------

export function useSupplierOptions() {
  return useQuery({
    queryKey: ["suppliers", "options"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<SupplierOption>>("/api/suppliers", {
        params: { pageSize: 100, isActive: true },
      });
      return data.items;
    },
    staleTime: 5 * 60_000,
  });
}
