import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CategoryNode, Paginated, ProductListItem, ProductsQuery } from "./types";

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
