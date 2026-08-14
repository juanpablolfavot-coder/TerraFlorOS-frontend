import type { Decimal } from "@/lib/format";

/**
 * Modelo Customer tal como lo expone el backend. Los nombres son los del
 * schema: `taxId` (CUIT), `segment`, `priceListId`, `creditLimit`.
 */

/** Segmentos del enum del backend (customers.schemas.ts). */
export const CUSTOMER_SEGMENTS = [
  "ocasional",
  "frecuente",
  "mayorista",
  "paisajista",
  "empresa",
  "revendedor",
] as const;

export type CustomerSegment = (typeof CUSTOMER_SEGMENTS)[number];

export const SEGMENT_LABEL: Record<CustomerSegment, string> = {
  ocasional: "Ocasional",
  frecuente: "Frecuente",
  mayorista: "Mayorista",
  paisajista: "Paisajista",
  empresa: "Empresa",
  revendedor: "Revendedor",
};

/**
 * Fila del listado (`GET /api/customers`). El backend hace un `select`
 * acotado: no trae ni `notes` ni las direcciones, para que la búsqueda
 * del POS sea liviana.
 */
export interface CustomerListItem {
  id: number;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  taxId: string | null;
  segment: CustomerSegment;
  priceListId: number | null;
  creditLimit: Decimal | null;
  isActive: boolean;
  createdAt: string;
}

export interface CustomerAddress {
  id: number;
  customerId: number;
  address: string;
  neighborhood: string | null;
  city: string | null;
  notes: string | null;
  /** Invariante del backend: si hay direcciones, exactamente una es la default. */
  isDefault: boolean;
}

/**
 * Detalle (`GET /api/customers/:id`): el cliente completo más la lista de
 * precios asignada, las direcciones (la default primera) y el saldo.
 */
export interface CustomerDetail extends CustomerListItem {
  notes: string | null;
  updatedAt: string;
  priceList: { id: number; name: string; isDefault: boolean } | null;
  addresses: CustomerAddress[];
  account: {
    /** Positivo = el cliente debe. Llega como number, ya sumado. */
    balance: number;
    entriesCount: number;
    creditLimit: number | null;
  };
}

/** POST /api/customers — el schema del backend es `.strict()`. */
export interface CreateCustomerBody {
  name: string;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  taxId?: string | null;
  segment?: CustomerSegment;
  priceListId?: number | null;
  creditLimit?: number | null;
  notes?: string | null;
  isActive?: boolean;
}

export type UpdateCustomerBody = Partial<CreateCustomerBody>;

/** POST /api/customers/:id/addresses — también `.strict()`. */
export interface CreateAddressBody {
  address: string;
  neighborhood?: string | null;
  city?: string | null;
  notes?: string | null;
  isDefault?: boolean;
}

/**
 * Asiento de cuenta corriente. `amount` positivo = deuda, negativo = pago.
 * Por ahora NO se crean desde el sistema: la lectura existe, la venta a
 * crédito todavía no.
 */
export interface AccountEntry {
  id: number;
  amount: Decimal;
  refType: string | null;
  refId: number | null;
  dueDate: string | null;
  description: string | null;
  userId: number;
  createdAt: string;
}

/** GET /api/customers/:id/account — paginado, más reciente primero. */
export interface CustomerAccount {
  balance: number;
  items: AccountEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CustomersQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  segment?: CustomerSegment;
  isActive?: boolean;
}
