import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { categoryKeys } from "@/features/products/api";
import type { CategoryNode } from "@/features/products/types";

/** POST /api/categories — `parentId` null o ausente = categoría raíz. */
export interface CreateCategoryBody {
  name: string;
  parentId?: number | null;
}

/** PATCH /api/categories/:id — al menos un campo. */
export interface UpdateCategoryBody {
  name?: string;
  parentId?: number | null;
  isActive?: boolean;
}

function useInvalidarCategorias() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: categoryKeys.tree });
    // El listado de productos muestra el nombre de la categoría
    void queryClient.invalidateQueries({ queryKey: ["products"] });
  };
}

export function useCreateCategory() {
  const invalidar = useInvalidarCategorias();

  return useMutation({
    mutationFn: async (body: CreateCategoryBody) => {
      const { data } = await api.post<CategoryNode>("/api/categories", body);
      return data;
    },
    onSuccess: invalidar,
  });
}

export function useUpdateCategory() {
  const invalidar = useInvalidarCategorias();

  return useMutation({
    mutationFn: async ({ id, ...body }: UpdateCategoryBody & { id: number }) => {
      const { data } = await api.patch<CategoryNode>(`/api/categories/${id}`, body);
      return data;
    },
    onSuccess: invalidar,
  });
}

/**
 * Baja lógica. 409 con `{ products, subcategories }` si todavía tiene
 * productos o subcategorías activas.
 */
export function useDeleteCategory() {
  const invalidar = useInvalidarCategorias();

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/categories/${id}`);
      return id;
    },
    onSuccess: invalidar,
  });
}

/** Detalle del 409 al borrar una categoría en uso. */
export interface CategoryConflict {
  products: number;
  subcategories: number;
}

export function detalleDeCategoria(error: unknown): CategoryConflict | null {
  const details = (error as { response?: { data?: { error?: { details?: unknown } } } })?.response
    ?.data?.error?.details;
  if (
    typeof details === "object" &&
    details !== null &&
    "products" in details &&
    "subcategories" in details
  ) {
    return details as CategoryConflict;
  }
  return null;
}
