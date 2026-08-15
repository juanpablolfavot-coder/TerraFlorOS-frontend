import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
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
import { Can, PERMISSIONS, useAuth } from "@/features/auth";
import { getApiErrorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDate, formatMoney, formatQuantity, formatQuantityWithUnit, toNumber } from "@/lib/format";
import { useDocumentTitle } from "@/lib/hooks";
import { AdjustStockDialog } from "./AdjustStockDialog";
import { MovementsCard } from "./MovementsCard";
import { SettleOversoldDialog } from "./SettleOversoldDialog";
import { useProductStock } from "./api";
import type { StockBatch } from "./types";

/** Estado sanitario del lote. `ok` no se muestra: es el caso normal. */
function EstadoDelLote({ lote }: { lote: StockBatch }) {
  if (lote.isOversell) return <Badge tone="danger">Sobreventa</Badge>;
  if (lote.healthStatus === "cuarentena") return <Badge tone="warning">Cuarentena</Badge>;
  if (lote.healthStatus === "observacion") return <Badge tone="info">En observación</Badge>;
  return <span className="text-stone-300">—</span>;
}

/**
 * Stock de un producto: sus lotes y su historial.
 *
 * El lote de sobreventa es el que puede estar en negativo, y es lo
 * primero que hay que ver: sale marcado en rojo y con el atajo para
 * regularizarlo. Ajustar y regularizar exigen `stock.adjust`; sin ese
 * permiso la pantalla es de solo lectura.
 */
export function InventoryProductPage() {
  const { id } = useParams<{ id: string }>();
  const productId = Number(id);

  const { can } = useAuth();
  const verCostos = can(PERMISSIONS.PRODUCTS_VIEW_COST);

  const { data, isPending, isFetching, error } = useProductStock(
    Number.isFinite(productId) ? productId : null
  );

  const [ajustando, setAjustando] = useState(false);
  const [regularizando, setRegularizando] = useState(false);

  useDocumentTitle(data?.product.name ?? "Inventario");

  if (isPending) return <LoadingBlock label="Cargando stock…" />;

  if (error !== null || data === undefined) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Inventario"
          actions={
            <Link to="/inventario" className="text-sm font-medium text-stone-500 hover:text-stone-800">
              Volver
            </Link>
          }
        />
        <Alert tone="danger" title="No se pudo cargar el stock del producto">
          {getApiErrorMessage(error)}
        </Alert>
      </div>
    );
  }

  const { product, batches, totals } = data;

  // La deuda vive en los lotes de sobreventa, que están en negativo
  const deuda = Math.abs(
    batches.filter((lote) => lote.isOversell).reduce((suma, lote) => suma + toNumber(lote.currentQty), 0)
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title={product.name}
        description={`${product.sku} · se mide en ${product.unit}`}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {product.kind === "PLANT" ? <Badge tone="brand">Planta</Badge> : <Badge>Convencional</Badge>}

            <Can permission={PERMISSIONS.STOCK_ADJUST}>
              <Button onClick={() => setAjustando(true)}>Ajustar stock</Button>
            </Can>

            <Can permission={PERMISSIONS.PRODUCTS_VIEW}>
              <Link
                to={`/productos/${product.id}`}
                className="text-sm font-medium text-stone-500 hover:text-stone-800"
              >
                Ficha del producto
              </Link>
            </Can>

            <Link to="/inventario" className="text-sm font-medium text-stone-500 hover:text-stone-800">
              Volver
            </Link>
          </div>
        }
      />

      {deuda > 0 && (
        <Alert tone="danger" title="Este producto arrastra una sobreventa">
          <div className="space-y-3">
            <p>
              Se vendieron <strong>{formatQuantityWithUnit(deuda, product.unit)}</strong> que no
              estaban cargadas. Regularizá cuando la mercadería esté físicamente en el vivero: se
              carga esa cantidad exacta y el lote de sobreventa queda en cero.
            </p>
            <Can
              permission={PERMISSIONS.STOCK_ADJUST}
              fallback={
                <p className="text-sm">
                  Para regularizarla hace falta el permiso de ajustar stock.
                </p>
              }
            >
              <Button variant="danger" size="sm" onClick={() => setRegularizando(true)}>
                Regularizar sobreventa
              </Button>
            </Can>
          </div>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total en lotes" value={formatQuantity(totals.total)} hint={product.unit} />
        <StatCard
          label="Reservado"
          value={formatQuantity(totals.reserved)}
          hint="Comprometido en reservas"
        />
        <StatCard
          label="Disponible"
          value={formatQuantity(totals.available)}
          tone={totals.available < 0 ? "danger" : totals.available === 0 ? "warning" : "default"}
          hint="Total menos lo reservado"
        />
      </div>

      <Card flush>
        <div className="p-6 sm:p-8">
          <CardHeader
            title="Lotes"
            description="Solo los que tienen cantidad distinta de cero, del más viejo al más nuevo (así se descuenta: FIFO)."
          />
        </div>

        {batches.length === 0 ? (
          <EmptyState
            title="Este producto no tiene lotes con stock"
            description="Cuando se reciba mercadería o se cargue un ajuste de entrada va a aparecer acá."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Lote</TH>
                <TH>Sucursal</TH>
                <TH>Ubicación</TH>
                <TH>Recibido</TH>
                <TH align="right">Cantidad</TH>
                <TH align="right">Reservado</TH>
                {verCostos && <TH align="right">Costo</TH>}
                <TH align="right">Estado</TH>
              </TR>
            </THead>

            <TBody>
              {batches.map((lote) => {
                const cantidad = toNumber(lote.currentQty);

                return (
                  <TR key={lote.id} className={cn(lote.isOversell && "bg-red-50/60")}>
                    <TD>
                      <span className="font-mono text-xs text-stone-700">{lote.code}</span>
                      {lote.supplier !== null && (
                        <span className="block text-xs text-stone-400">
                          {lote.supplier.tradeName ?? lote.supplier.legalName}
                        </span>
                      )}
                    </TD>

                    <TD className="text-stone-600">{lote.branch.name}</TD>

                    <TD className="text-stone-600">
                      {lote.location === null ? (
                        <span className="text-stone-400">Sin ubicación</span>
                      ) : (
                        <>
                          {lote.location.name}
                          <span className="block text-xs text-stone-400">
                            {lote.location.warehouse.name}
                          </span>
                        </>
                      )}
                    </TD>

                    <TD className="text-stone-600">{formatDate(lote.receivedAt)}</TD>

                    <TD align="right" numeric>
                      <span
                        className={cn(
                          "font-medium",
                          cantidad < 0 ? "text-red-600" : "text-stone-900"
                        )}
                      >
                        {formatQuantity(cantidad)}
                      </span>
                    </TD>

                    <TD align="right" numeric className="text-stone-500">
                      {formatQuantity(lote.reservedQty)}
                    </TD>

                    {verCostos && (
                      <TD align="right" numeric className="text-stone-600">
                        {formatMoney(lote.unitCost)}
                      </TD>
                    )}

                    <TD align="right">
                      <EstadoDelLote lote={lote} />
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}

        {/*
          Este endpoint NO filtra por sucursal: trae los lotes del producto
          en todas, y los totales suman todo. De ahí la columna Sucursal y
          esta aclaración — el ajuste, en cambio, se aplica sobre la
          sucursal del usuario.
        */}
        <p className="px-6 pb-6 text-sm text-stone-400 sm:px-8">
          Los lotes y los totales incluyen todas las sucursales.
        </p>
      </Card>

      <MovementsCard productId={product.id} />

      {ajustando && (
        <AdjustStockDialog
          open
          stock={data}
          refrescando={isFetching}
          onClose={() => setAjustando(false)}
        />
      )}

      {regularizando && (
        <SettleOversoldDialog
          open
          stock={data}
          deuda={deuda}
          refrescando={isFetching}
          onClose={() => setRegularizando(false)}
        />
      )}
    </div>
  );
}
