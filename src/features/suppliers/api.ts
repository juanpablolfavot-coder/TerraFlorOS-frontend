import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, isApiError } from "@/lib/api";
import type { Paginated } from "@/features/products/types";
import type {
  CreateSupplierBody,
  CreateSupplierProductBody,
  OpenPurchasesConflict,
  Supplier,
  SupplierProduct,
  SuppliersQuery,
  UpdateSupplierBody,
  UpdateSupplierProductBody,
} from "./types";

export const supplierKeys = {
  all: ["suppliers"] as const,
  list: (query: SuppliersQuery) => ["suppliers", "list", query] as const,
  detail: (id: number) => ["suppliers", "detail", id] as const,
  products: (id: number) => ["suppliers", "products", id] as const,
};

function useInvalidarProveedores() {
  const queryClient = useQueryClient();
  return (id?: number) => {
    void queryClient.invalidateQueries({ queryKey: supplierKeys.all });
    if (id !== undefined) {
      void queryClient.invalidateQueries({ queryKey: supplierKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: supplierKeys.products(id) });
    }
  };
}

/** Leer proveedores requiere `products.view`, no `suppliers.manage`. */
export function useSupplierList(query: SuppliersQuery) {
  return useQuery({
    queryKey: supplierKeys.list(query),
    queryFn: async () => {
      const { data } = await api.get<Paginated<Supplier>>("/api/suppliers", { params: query });
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useSupplier(id: number | null) {
  return useQuery({
    queryKey: supplierKeys.detail(id ?? 0),
    enabled: id !== null,
    queryFn: async () => {
      const { data } = await api.get<Supplier>(`/api/suppliers/${id}`);
      return data;
    },
  });
}

export function useCreateSupplier() {
  const invalidar = useInvalidarProveedores();

  return useMutation({
    mutationFn: async (body: CreateSupplierBody) => {
      const { data } = await api.post<Supplier>("/api/suppliers", body);
      return data;
    },
    onSuccess: (proveedor) => invalidar(proveedor.id),
  });
}

export function useUpdateSupplier(id: number) {
  const invalidar = useInvalidarProveedores();

  return useMutation({
    mutationFn: async (body: UpdateSupplierBody) => {
      const { data } = await api.patch<Supplier>(`/api/suppliers/${id}`, body);
      return data;
    },
    onSuccess: () => invalidar(id),
  });
}

/** Baja lógica. 409 con `{ openPurchases }` si tiene compras sin finalizar. */
export function useDeleteSupplier() {
  const invalidar = useInvalidarProveedores();

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/suppliers/${id}`);
      return id;
    },
    onSuccess: (id) => invalidar(id),
  });
}

// ---------------------------------------------------------------
// Catálogo del proveedor
// ---------------------------------------------------------------

export function useSupplierProducts(supplierId: number | null) {
  return useQuery({
    queryKey: supplierKeys.products(supplierId ?? 0),
    enabled: supplierId !== null,
    queryFn: async () => {
      const { data } = await api.get<SupplierProduct[]>(`/api/suppliers/${supplierId}/products`);
      return data;
    },
  });
}

/** 409 si el proveedor ya tiene ese producto con esa presentación. */
export function useAddSupplierProduct(supplierId: number) {
  const invalidar = useInvalidarProveedores();

  return useMutation({
    mutationFn: async (body: CreateSupplierProductBody) => {
      const { data } = await api.post<SupplierProduct>(
        `/api/suppliers/${supplierId}/products`,
        body
      );
      return data;
    },
    onSuccess: () => invalidar(supplierId),
  });
}

export function useUpdateSupplierProduct(supplierId: number) {
  const invalidar = useInvalidarProveedores();

  return useMutation({
    mutationFn: async ({ spId, ...body }: UpdateSupplierProductBody & { spId: number }) => {
      const { data } = await api.patch<SupplierProduct>(
        `/api/suppliers/${supplierId}/products/${spId}`,
        body
      );
      return data;
    },
    onSuccess: () => invalidar(supplierId),
  });
}

export function useRemoveSupplierProduct(supplierId: number) {
  const invalidar = useInvalidarProveedores();

  return useMutation({
    mutationFn: async (spId: number) => {
      await api.delete(`/api/suppliers/${supplierId}/products/${spId}`);
    },
    onSuccess: () => invalidar(supplierId),
  });
}

/** Detalle del 409 al intentar dar de baja un proveedor con compras abiertas. */
export function conflictoDeCompras(error: unknown): OpenPurchasesConflict | null {
  if (!isApiError(error)) return null;
  const details = error.response?.data?.error?.details;
  return typeof details === "object" && details !== null && "openPurchases" in details
    ? (details as unknown as OpenPurchasesConflict)
    : null;
}

/**
 * Opciones para los selectores (formulario de compra, ficha de producto).
 * Vive acá para que haya una sola implementación; el módulo de compras la
 * reexporta con el nombre que ya usaba.
 */
export function useSupplierOptions(search?: string) {
  return useQuery({
    queryKey: ["suppliers", "options", search ?? ""],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Supplier>>("/api/suppliers", {
        params: { pageSize: 100, isActive: true, ...(search ? { search } : {}) },
      });
      return data.items;
    },
    staleTime: 5 * 60_000,
  });
}
