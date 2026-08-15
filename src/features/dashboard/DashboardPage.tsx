import { Link } from "react-router-dom";
import {
  Alert,
  Badge,
  Card,
  CardHeader,
  EmptyState,
  LoadingBlock,
  PageHeader,
  StatCard,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import { useAuth } from "@/features/auth";
import { getApiErrorMessage } from "@/lib/api";
import { formatMoney, formatNumber, formatQuantity } from "@/lib/format";
import { comoListaDeObjetos } from "@/lib/safe";
import { useDashboardPlants, useDashboardStock, useDashboardToday } from "./api";

/**
 * Panel del día.
 *
 * Es la pantalla de arranque, así que ninguna tarjeta puede tumbarla: si
 * un endpoint responde vacío o con una forma distinta a la esperada, se
 * muestra en cero. Por eso cada rama del JSON se lee con `?.` hasta el
 * final (los formateadores ya traducen `undefined` a 0) y las listas
 * pasan por `comoListaDeObjetos`, que además descarta elementos nulos.
 */
export function DashboardPage() {
  const { user } = useAuth();
  const today = useDashboardToday();
  const stock = useDashboardStock();
  const plants = useDashboardPlants();

  const ventas = today.data?.sales;
  const cobros = comoListaDeObjetos(today.data?.paymentsByMethod);
  const conteos = stock.data?.counts;
  const paraReponer = comoListaDeObjetos(stock.data?.criticalProducts);
  const cuarentena = plants.data?.quarantine;
  const perdidas = plants.data?.lossesThisMonth;

  const isLoading = today.isPending || stock.isPending || plants.isPending;
  const error = today.error ?? stock.error ?? plants.error;

  return (
    <div className="space-y-10">
      <PageHeader
        title={`Hola, ${user?.fullName.split(" ")[0] ?? ""}`}
        description="Resumen del día: ventas, stock y estado de las plantas."
      />

      {error !== null && error !== undefined && (
        <Alert tone="danger" title="No se pudo cargar el panel">
          {getApiErrorMessage(error)}
        </Alert>
      )}

      {isLoading ? (
        <LoadingBlock label="Cargando el panel…" />
      ) : (
        <>
          {/* Ventas del día */}
          <section className="space-y-5">
            <h2 className="text-sm font-semibold tracking-wide text-stone-500 uppercase">
              Hoy
            </h2>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Facturación" value={formatMoney(ventas?.revenue)} tone="brand" />
              <StatCard label="Tickets" value={formatNumber(ventas?.tickets)} />
              <StatCard label="Ticket promedio" value={formatMoney(ventas?.averageTicket)} />
              {/* El margen solo viaja con products.view_cost */}
              {ventas?.margin !== undefined ? (
                <StatCard
                  label="Margen"
                  value={formatMoney(ventas.margin)}
                  hint={`CMV ${formatMoney(ventas.cmv)}`}
                />
              ) : (
                <StatCard label="Unidades vendidas" value={formatQuantity(ventas?.units)} />
              )}
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <Card flush>
                <div className="p-6 sm:p-8">
                  <CardHeader
                    title="Cobros por medio de pago"
                    description="Ventas completadas del día."
                  />
                </div>

                {cobros.length > 0 ? (
                  <Table>
                    <THead>
                      <TR>
                        <TH>Medio</TH>
                        <TH align="right">Operaciones</TH>
                        <TH align="right">Total</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {cobros.map((method) => (
                        <TR key={method.paymentMethodId}>
                          <TD>
                            <span className="flex items-center gap-2">
                              {method.name}
                              {method.affectsCash && <Badge tone="brand">Efectivo</Badge>}
                            </span>
                          </TD>
                          <TD align="right" numeric>
                            {formatNumber(method.count)}
                          </TD>
                          <TD align="right" numeric className="font-medium text-stone-900">
                            {formatMoney(method.total)}
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                ) : (
                  <EmptyState
                    title="Todavía no hay cobros hoy"
                    description="Las ventas que se completen van a aparecer acá."
                  />
                )}
              </Card>

              <Card className="space-y-6">
                <CardHeader title="Plantas" description="Estado del stock vivo." />

                <dl className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <dt className="text-sm text-stone-500">Stock vivo</dt>
                    <dd className="tabular text-2xl font-semibold">
                      {formatQuantity(plants.data?.liveStock)}
                    </dd>
                  </div>
                  <div className="space-y-1.5">
                    <dt className="text-sm text-stone-500">Productos planta con stock</dt>
                    <dd className="tabular text-2xl font-semibold">
                      {formatNumber(plants.data?.plantProductsWithStock)}
                    </dd>
                  </div>
                  <div className="space-y-1.5">
                    <dt className="text-sm text-stone-500">En cuarentena</dt>
                    <dd className="tabular text-2xl font-semibold text-amber-600">
                      {formatQuantity(cuarentena?.quantity)}
                    </dd>
                  </div>
                  <div className="space-y-1.5">
                    <dt className="text-sm text-stone-500">Pérdidas del mes</dt>
                    <dd className="tabular text-2xl font-semibold text-red-600">
                      {formatQuantity(perdidas?.units)}
                    </dd>
                    {/* El costo de las pérdidas también pide products.view_cost */}
                    {perdidas?.cost !== undefined && (
                      <p className="text-sm text-stone-400">
                        {formatMoney(perdidas.cost)} en costo
                      </p>
                    )}
                  </div>
                </dl>
              </Card>
            </div>
          </section>

          {/* Stock */}
          <section className="space-y-5">
            <h2 className="text-sm font-semibold tracking-wide text-stone-500 uppercase">
              Inventario
            </h2>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Productos activos"
                value={formatNumber(conteos?.totalProducts)}
              />
              <StatCard
                label="Bajo mínimo"
                value={formatNumber(conteos?.critical)}
                tone="warning"
              />
              <StatCard
                label="Sin stock"
                value={formatNumber(conteos?.outOfStock)}
                tone="danger"
              />
              {stock.data?.inventoryValueAtCost !== undefined ? (
                <StatCard
                  label="Valor del inventario"
                  value={formatMoney(stock.data.inventoryValueAtCost)}
                  hint={`${formatNumber(stock.data.batchesWithStock)} lotes con stock`}
                />
              ) : (
                <StatCard label="Con exceso" value={formatNumber(conteos?.excess)} />
              )}
            </div>

            <Card flush>
              <div className="p-6 sm:p-8">
                <CardHeader
                  title="Productos para reponer"
                  description="Los que están en o por debajo del mínimo definido."
                  action={
                    <Link
                      to="/productos"
                      className="text-sm font-medium text-brand-700 hover:text-brand-800"
                    >
                      Ver productos
                    </Link>
                  }
                />
              </div>

              {paraReponer.length > 0 ? (
                <Table>
                  <THead>
                    <TR>
                      <TH>SKU</TH>
                      <TH>Producto</TH>
                      <TH align="right">Disponible</TH>
                      <TH align="right">Mínimo</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {paraReponer.map((product) => (
                      <TR key={product.id}>
                        <TD className="font-mono text-xs text-stone-500">{product.sku}</TD>
                        <TD className="font-medium text-stone-900">{product.name}</TD>
                        <TD align="right" numeric>
                          <span
                            className={product.available <= 0 ? "font-medium text-red-600" : undefined}
                          >
                            {formatQuantity(product.available)}
                          </span>
                        </TD>
                        <TD align="right" numeric className="text-stone-500">
                          {formatQuantity(product.minStock)}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              ) : (
                <EmptyState
                  title="Nada para reponer"
                  description="Ningún producto está por debajo de su stock mínimo."
                />
              )}
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
