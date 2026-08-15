import { Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { CashPage } from "@/features/cash/CashPage";
import { CategoriesPage } from "@/features/categories/CategoriesPage";
import { CustomerDetailPage } from "@/features/customers/CustomerDetailPage";
import { CustomersPage } from "@/features/customers/CustomersPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { PriceLookupPage } from "@/features/prices/PriceLookupPage";
import { ProductDetailPage } from "@/features/products/ProductDetailPage";
import { ProductsPage } from "@/features/products/ProductsPage";
import { PurchaseDetailPage } from "@/features/purchases/PurchaseDetailPage";
import { QuoteConvertPage } from "@/features/quotes/QuoteConvertPage";
import { QuoteDetailPage } from "@/features/quotes/QuoteDetailPage";
import { QuoteFormPage } from "@/features/quotes/QuoteFormPage";
import { QuotePrintPage } from "@/features/quotes/QuotePrintPage";
import { QuotesPage } from "@/features/quotes/QuotesPage";
import { PurchasesPage } from "@/features/purchases/PurchasesPage";
import { RestockPage } from "@/features/purchases/RestockPage";
import { SupplierDetailPage } from "@/features/suppliers/SupplierDetailPage";
import { SuppliersPage } from "@/features/suppliers/SuppliersPage";
import { PosPage } from "@/features/sales/PosPage";
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
        {/* Fuera del layout: el comprobante se imprime sin menú ni barra */}
        <Route element={<RequirePermission permission={PERMISSIONS.SALES_CREATE} />}>
          <Route path="presupuestos/:id/comprobante" element={<QuotePrintPage />} />
        </Route>

        <Route element={<AppLayout />}>
          <Route index element={<HomeRedirect />} />
          <Route path="sin-permiso" element={<ForbiddenPage />} />

          <Route element={<RequirePermission permission={PERMISSIONS.REPORTS_VIEW} />}>
            <Route path="panel" element={<DashboardPage />} />
          </Route>

          <Route element={<RequirePermission permission={PERMISSIONS.SALES_CREATE} />}>
            <Route path="ventas" element={<PosPage />} />
            {/* Presupuestar pide el mismo permiso que vender */}
            <Route path="presupuestos" element={<QuotesPage />} />
            <Route path="presupuestos/nuevo" element={<QuoteFormPage />} />
            <Route path="presupuestos/:id" element={<QuoteDetailPage />} />
            <Route path="presupuestos/:id/editar" element={<QuoteFormPage />} />
            <Route path="presupuestos/:id/convertir" element={<QuoteConvertPage />} />
          </Route>

          <Route
            element={
              // Leer el estado de la caja alcanza con sales.create (así lo
              // resuelve el backend); mover y cerrar se ocultan con <Can>.
              <RequirePermission
                anyOf={[
                  PERMISSIONS.SALES_CREATE,
                  PERMISSIONS.CASH_OPEN,
                  PERMISSIONS.CASH_MOVEMENT,
                  PERMISSIONS.CASH_CLOSE,
                ]}
              />
            }
          >
            <Route path="caja" element={<CashPage />} />
          </Route>

          <Route element={<RequirePermission permission={PERMISSIONS.PRODUCTS_VIEW} />}>
            <Route path="consulta-precios" element={<PriceLookupPage />} />
            <Route path="productos" element={<ProductsPage />} />
            {/* "nuevo" y :id comparten pantalla: el alta es el detalle vacío */}
            <Route path="productos/:id" element={<ProductDetailPage />} />
            <Route path="categorias" element={<CategoriesPage />} />
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
            <Route path="compras" element={<PurchasesPage />} />
            {/* "nueva" y :id comparten pantalla, igual que en productos */}
            <Route path="compras/:id" element={<PurchaseDetailPage />} />
            <Route path="reposicion" element={<RestockPage />} />
          </Route>

          <Route
            element={
              // Leer clientes acepta sales.create o customers.manage (así lo
              // resuelve el backend); las acciones de escritura se ocultan
              // con <Can customers.manage>.
              <RequirePermission
                anyOf={[PERMISSIONS.SALES_CREATE, PERMISSIONS.CUSTOMERS_MANAGE]}
              />
            }
          >
            <Route path="clientes" element={<CustomersPage />} />
            {/* "nuevo" y :id comparten pantalla, igual que en productos */}
            <Route path="clientes/:id" element={<CustomerDetailPage />} />
          </Route>

          {/* Leer proveedores requiere products.view, igual que el backend */}
          <Route element={<RequirePermission permission={PERMISSIONS.PRODUCTS_VIEW} />}>
            <Route path="proveedores" element={<SuppliersPage />} />
            <Route path="proveedores/:id" element={<SupplierDetailPage />} />
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
