import { Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { ProductsPage } from "@/features/products/ProductsPage";
import { PERMISSIONS, RequireAuth, RequirePermission } from "@/features/auth";
import { ForbiddenPage, NotFoundPage } from "@/pages/ErrorPages";
import { HomeRedirect } from "@/pages/HomeRedirect";
import { LoginPage } from "@/pages/LoginPage";
import { PlaceholderPage } from "@/pages/PlaceholderPage";

/**
 * Cada módulo va detrás del mismo permiso que exige el backend. Es solo
 * navegación: si alguien entra a mano a una ruta, igual el endpoint le
 * va a responder 403.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<HomeRedirect />} />
          <Route path="sin-permiso" element={<ForbiddenPage />} />

          <Route element={<RequirePermission permission={PERMISSIONS.REPORTS_VIEW} />}>
            <Route path="panel" element={<DashboardPage />} />
          </Route>

          <Route element={<RequirePermission permission={PERMISSIONS.SALES_CREATE} />}>
            <Route
              path="ventas"
              element={
                <PlaceholderPage
                  title="Ventas"
                  description="Punto de venta: carga de productos, cobro y ticket."
                  next={[
                    "Búsqueda por código de barras (GET /api/products/by-barcode/:code)",
                    "Carrito con lista de precios y descuentos (sales.discount)",
                    "Cobro con varios medios de pago y cierre de venta (POST /api/sales)",
                    "Anulación de ventas para quien tenga sales.void",
                  ]}
                />
              }
            />
          </Route>

          <Route
            element={
              <RequirePermission
                anyOf={[PERMISSIONS.CASH_OPEN, PERMISSIONS.CASH_MOVEMENT, PERMISSIONS.CASH_CLOSE]}
              />
            }
          >
            <Route
              path="caja"
              element={
                <PlaceholderPage
                  title="Caja"
                  description="Apertura, movimientos y cierre del turno."
                  next={[
                    "Estado del turno actual (GET /api/cash/sessions/current)",
                    "Apertura con saldo inicial (POST /api/cash/sessions)",
                    "Ingresos y egresos de efectivo (POST /api/cash/sessions/:id/movements)",
                    "Cierre con arqueo y diferencia (POST /api/cash/sessions/:id/close)",
                  ]}
                />
              }
            />
          </Route>

          <Route element={<RequirePermission permission={PERMISSIONS.PRODUCTS_VIEW} />}>
            <Route path="productos" element={<ProductsPage />} />
          </Route>

          <Route element={<RequirePermission permission={PERMISSIONS.STOCK_VIEW} />}>
            <Route
              path="inventario"
              element={
                <PlaceholderPage
                  title="Inventario"
                  description="Stock por lote, movimientos y ajustes."
                  next={[
                    "Stock de un producto por lote y depósito (GET /api/inventory/products/:id)",
                    "Historial de movimientos con filtros (GET /api/stock-movements)",
                    "Ajustes de stock para quien tenga stock.adjust",
                    "Registro de pérdidas y cuarentena (stock.register_loss)",
                  ]}
                />
              }
            />
          </Route>

          <Route
            element={
              <RequirePermission
                anyOf={[PERMISSIONS.PURCHASES_MANAGE, PERMISSIONS.PURCHASES_RECEIVE]}
              />
            }
          >
            <Route
              path="compras"
              element={
                <PlaceholderPage
                  title="Compras"
                  description="Órdenes de compra y recepción de mercadería."
                  next={[
                    "Listado y alta de órdenes (GET/POST /api/purchases)",
                    "Cambios de estado del circuito (POST /api/purchases/:id/status)",
                    "Recepción total o parcial, que actualiza costos (POST /api/purchases/:id/receipts)",
                    "Aviso de aumento de costo según purchases.cost_increase_alert_pct",
                  ]}
                />
              }
            />
          </Route>

          <Route element={<RequirePermission permission={PERMISSIONS.PRODUCTS_VIEW} />}>
            <Route
              path="proveedores"
              element={
                <PlaceholderPage
                  title="Proveedores"
                  description="Padrón de proveedores y productos que provee cada uno."
                  next={[
                    "Listado y ficha de proveedor (GET /api/suppliers)",
                    "Alta y edición para quien tenga suppliers.manage",
                    "Productos por proveedor con código y costo (GET /api/suppliers/:id/products)",
                  ]}
                />
              }
            />
          </Route>

          <Route element={<RequirePermission permission={PERMISSIONS.USERS_MANAGE} />}>
            <Route
              path="usuarios"
              element={
                <PlaceholderPage
                  title="Usuarios"
                  description="Altas, roles y permisos individuales."
                  next={[
                    "Listado y alta de usuarios (GET/POST /api/users)",
                    "Asignación de rol (GET /api/roles)",
                    "Overrides de permisos por usuario (PUT /api/users/:id/permissions)",
                    "Reseteo de contraseña (POST /api/users/:id/password)",
                  ]}
                />
              }
            />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
