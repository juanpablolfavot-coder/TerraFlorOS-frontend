import type { ComponentType, SVGProps } from "react";
import {
  IconBoxes,
  IconBuilding,
  IconCash,
  IconContact,
  IconDashboard,
  IconHistory,
  IconLeaf,
  IconQuote,
  IconSales,
  IconSettings,
  IconTag,
  IconTruck,
  IconUsers,
} from "@/components/icons";
import { PERMISSIONS, type PermissionCode } from "@/features/auth";

export interface NavItem {
  label: string;
  to: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** El módulo se muestra si el usuario tiene AL MENOS uno de estos permisos. */
  anyOf: PermissionCode[];
}

/**
 * Módulos del ERP en el orden en que se usan durante el día.
 * El menú se filtra por permisos: cada quien ve solo lo suyo.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    label: "Panel",
    to: "/panel",
    icon: IconDashboard,
    anyOf: [PERMISSIONS.REPORTS_VIEW],
  },
  {
    label: "Ventas",
    to: "/ventas",
    icon: IconSales,
    anyOf: [PERMISSIONS.SALES_CREATE],
  },
  {
    label: "Presupuestos",
    to: "/presupuestos",
    icon: IconQuote,
    // Igual que el backend: presupuestar pide el mismo permiso que vender
    anyOf: [PERMISSIONS.SALES_CREATE],
  },
  {
    label: "Consulta de precios",
    to: "/consulta-precios",
    icon: IconTag,
    anyOf: [PERMISSIONS.PRODUCTS_VIEW],
  },
  {
    label: "Caja",
    to: "/caja",
    icon: IconCash,
    // Igual que el backend: leer la caja alcanza con sales.create
    anyOf: [
      PERMISSIONS.SALES_CREATE,
      PERMISSIONS.CASH_OPEN,
      PERMISSIONS.CASH_MOVEMENT,
      PERMISSIONS.CASH_CLOSE,
    ],
  },
  {
    label: "Historial de cajas",
    to: "/caja/historial",
    icon: IconHistory,
    // El backend pide cash.close O reports.view para el historial
    anyOf: [PERMISSIONS.CASH_CLOSE, PERMISSIONS.REPORTS_VIEW],
  },
  {
    label: "Productos",
    to: "/productos",
    icon: IconLeaf,
    anyOf: [PERMISSIONS.PRODUCTS_VIEW],
  },
  {
    label: "Inventario",
    to: "/inventario",
    icon: IconBoxes,
    anyOf: [PERMISSIONS.STOCK_VIEW],
  },
  {
    label: "Compras",
    to: "/compras",
    icon: IconTruck,
    anyOf: [PERMISSIONS.PURCHASES_MANAGE, PERMISSIONS.PURCHASES_RECEIVE],
  },
  {
    label: "Clientes",
    to: "/clientes",
    icon: IconContact,
    // Igual que el backend: leer clientes alcanza con sales.create, porque
    // el POS necesita elegir cliente al facturar
    anyOf: [PERMISSIONS.SALES_CREATE, PERMISSIONS.CUSTOMERS_MANAGE],
  },
  {
    label: "Proveedores",
    to: "/proveedores",
    icon: IconBuilding,
    anyOf: [PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.SUPPLIERS_MANAGE],
  },
  {
    label: "Configuración",
    to: "/configuracion",
    icon: IconSettings,
    anyOf: [PERMISSIONS.SETTINGS_MANAGE],
  },
  {
    label: "Usuarios",
    to: "/usuarios",
    icon: IconUsers,
    anyOf: [PERMISSIONS.USERS_MANAGE],
  },
];

/** Módulos visibles para un conjunto de permisos efectivos. */
export function visibleNavItems(permissions: ReadonlySet<string>): NavItem[] {
  return NAV_ITEMS.filter((item) => item.anyOf.some((code) => permissions.has(code)));
}
