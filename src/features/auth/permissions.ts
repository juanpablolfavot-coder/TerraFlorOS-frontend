/**
 * Códigos de permiso del backend (ver prisma/seed.ts).
 *
 * Ojo: esto es SOLO para la interfaz — decide qué se muestra y qué se
 * oculta. La autorización real la aplica el backend en cada endpoint con
 * `requirePermission`. Esconder un botón no protege nada.
 */
export const PERMISSIONS = {
  PRODUCTS_VIEW: "products.view",
  PRODUCTS_MANAGE: "products.manage",
  PRODUCTS_VIEW_COST: "products.view_cost",
  PRODUCTS_EDIT_COST: "products.edit_cost",
  PRICES_EDIT: "prices.edit",

  STOCK_VIEW: "stock.view",
  STOCK_ADJUST: "stock.adjust",
  STOCK_REGISTER_LOSS: "stock.register_loss",
  STOCK_ALLOW_NEGATIVE: "stock.allow_negative",

  PURCHASES_MANAGE: "purchases.manage",
  PURCHASES_RECEIVE: "purchases.receive",

  SUPPLIERS_MANAGE: "suppliers.manage",

  SALES_CREATE: "sales.create",
  SALES_DISCOUNT: "sales.discount",
  SALES_VOID: "sales.void",
  SALES_REFUND: "sales.refund",

  CASH_OPEN: "cash.open",
  CASH_MOVEMENT: "cash.movement",
  CASH_CLOSE: "cash.close",

  CUSTOMERS_MANAGE: "customers.manage",
  TASKS_MANAGE: "tasks.manage",
  REPORTS_VIEW: "reports.view",
  USERS_MANAGE: "users.manage",
  SETTINGS_MANAGE: "settings.manage",
  AUDIT_VIEW: "audit.view",
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
