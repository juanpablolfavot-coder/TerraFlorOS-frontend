import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Paginated } from "@/features/products/types";
import type {
  CreateAddressBody,
  CreateCustomerBody,
  CustomerAccount,
  CustomerAddress,
  CustomerDetail,
  CustomerListItem,
  CustomersQuery,
  UpdateCustomerBody,
} from "./types";

export const customerKeys = {
  all: ["customers"] as const,
  list: (query: CustomersQuery) => ["customers", "list", query] as const,
  detail: (id: number) => ["customers", "detail", id] as const,
  account: (id: number, page: number) => ["customers", "account", id, page] as const,
  search: (term: string) => ["customers", "search", term] as const,
};

function useInvalidarClientes() {
  const queryClient = useQueryClient();
  return (id?: number) => {
    void queryClient.invalidateQueries({ queryKey: customerKeys.all });
    if (id !== undefined) {
      void queryClient.invalidateQueries({ queryKey: customerKeys.detail(id) });
    }
  };
}

/**
 * Listado paginado. Leer clientes acepta `sales.create` O `customers.manage`:
 * el POS necesita buscar y elegir cliente al facturar.
 */
export function useCustomerList(query: CustomersQuery) {
  return useQuery({
    queryKey: customerKeys.list(query),
    queryFn: async () => {
      const { data } = await api.get<Paginated<CustomerListItem>>("/api/customers", {
        params: query,
      });
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useCustomer(id: number | null) {
  return useQuery({
    queryKey: customerKeys.detail(id ?? 0),
    enabled: id !== null,
    queryFn: async () => {
      const { data } = await api.get<CustomerDetail>(`/api/customers/${id}`);
      return data;
    },
  });
}

export function useCreateCustomer() {
  const invalidar = useInvalidarClientes();

  return useMutation({
    mutationFn: async (body: CreateCustomerBody) => {
      const { data } = await api.post<CustomerDetail>("/api/customers", body);
      return data;
    },
    onSuccess: (cliente) => invalidar(cliente.id),
  });
}

export function useUpdateCustomer(id: number) {
  const invalidar = useInvalidarClientes();

  return useMutation({
    mutationFn: async (body: UpdateCustomerBody) => {
      const { data } = await api.patch<CustomerDetail>(`/api/customers/${id}`, body);
      return data;
    },
    onSuccess: () => invalidar(id),
  });
}

/** Baja lógica: el cliente queda inactivo y se conserva el historial. */
export function useDeleteCustomer() {
  const invalidar = useInvalidarClientes();

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/customers/${id}`);
      return id;
    },
    onSuccess: (id) => invalidar(id),
  });
}

// ---------------------------------------------------------------
// Direcciones
// ---------------------------------------------------------------

/**
 * Alta de dirección. La invariante «una sola default» la resuelve el
 * backend: la primera queda principal aunque no se pida, y marcar una
 * nueva desmarca la anterior. Por eso alcanza con refrescar el detalle.
 */
export function useAddAddress(customerId: number) {
  const invalidar = useInvalidarClientes();

  return useMutation({
    mutationFn: async (body: CreateAddressBody) => {
      const { data } = await api.post<CustomerAddress>(
        `/api/customers/${customerId}/addresses`,
        body
      );
      return data;
    },
    onSuccess: () => invalidar(customerId),
  });
}

/** Baja de dirección. Si se borra la principal, el backend promueve otra. */
export function useRemoveAddress(customerId: number) {
  const invalidar = useInvalidarClientes();

  return useMutation({
    mutationFn: async (addressId: number) => {
      await api.delete(`/api/customers/${customerId}/addresses/${addressId}`);
    },
    onSuccess: () => invalidar(customerId),
  });
}

// ---------------------------------------------------------------
// Cuenta corriente (solo lectura)
// ---------------------------------------------------------------

/**
 * Movimientos de cuenta corriente y saldo. SOLO LECTURA: el backend
 * todavía no crea asientos (no hay venta a crédito ni registro de pagos),
 * así que la pantalla no ofrece acciones sobre la cuenta.
 */
export function useCustomerAccount(customerId: number | null, page = 1) {
  return useQuery({
    queryKey: customerKeys.account(customerId ?? 0, page),
    enabled: customerId !== null,
    queryFn: async () => {
      const { data } = await api.get<CustomerAccount>(`/api/customers/${customerId}/account`, {
        params: { page, pageSize: 20 },
      });
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

// ---------------------------------------------------------------
// Búsqueda para el POS
// ---------------------------------------------------------------

/** Typeahead del POS: solo clientes activos, de a pocos. */
export function useCustomerSearch(term: string) {
  const search = term.trim();

  return useQuery({
    queryKey: customerKeys.search(search),
    enabled: search.length >= 2,
    queryFn: async () => {
      const { data } = await api.get<Paginated<CustomerListItem>>("/api/customers", {
        params: { search, pageSize: 8, isActive: true },
      });
      return data.items;
    },
    placeholderData: keepPreviousData,
  });
}
