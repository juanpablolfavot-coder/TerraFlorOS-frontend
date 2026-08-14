import { Link, useNavigate } from "react-router-dom";
import {
  Alert,
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
import { getApiErrorMessage } from "@/lib/api";
import { formatNumber, formatQuantity } from "@/lib/format";
import { useDocumentTitle } from "@/lib/hooks";
import { useRestockList } from "./api";
import { PURCHASE_STATUS_LABEL, type PurchaseStatus } from "./types";

/**
 * Productos por debajo del mínimo.
 *
 * OJO con las expectativas: esto NO es compra sugerida. No calcula
 * cantidades a pedir, ni estacionalidad, ni recomienda proveedores — el
 * backend no computa nada de eso. Es la lista de lo que está bajo el
 * mínimo que ya define cada producto, y nada más.
 */
export function RestockPage() {
  useDocumentTitle("A reponer");

  const navigate = useNavigate();
  const datos = useRestockList();

  if (datos.isPending) return <LoadingBlock label="Buscando productos bajo mínimo…" />;

  if (datos.error !== null) {
    return (
      <div className="space-y-8">
        <PageHeader title="Productos a reponer" />
        <Alert tone="danger" title="No se pudo cargar la lista">
          {getApiErrorMessage(datos.error)}
        </Alert>
      </div>
    );
  }

  const { pending, toRestock } = datos.data!;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Productos a reponer"
        description="Los que están en o por debajo del stock mínimo que tienen definido."
        actions={
          <Link to="/compras" className="text-sm font-medium text-stone-500 hover:text-stone-800">
            Ver compras
          </Link>
        }
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <StatCard
          label="Bajo stock mínimo"
          value={formatNumber(toRestock.count)}
          tone={toRestock.count > 0 ? "warning" : "default"}
          hint="Productos que ya tocaron su mínimo."
        />
        <StatCard
          label="Órdenes en curso"
          value={formatNumber(pending.total)}
          hint={
            pending.byStatus.length === 0
              ? "Sin compras pendientes."
              : pending.byStatus
                  .map(
                    (e) =>
                      `${e.count} ${PURCHASE_STATUS_LABEL[e.status as PurchaseStatus] ?? e.status}`
                  )
                  .join(" · ")
          }
        />
      </div>

      <Card flush>
        <div className="p-6 sm:p-8">
          <CardHeader
            title="Bajo mínimo"
            description="La cantidad a pedir la decidís vos: el sistema no la calcula."
            action={
              <Button onClick={() => navigate("/compras/nueva")}>Iniciar una compra</Button>
            }
          />
        </div>

        {toRestock.products.length === 0 ? (
          <EmptyState
            title="Nada para reponer"
            description="Ningún producto está por debajo de su stock mínimo."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>SKU</TH>
                <TH>Producto</TH>
                <TH align="right">Disponible</TH>
                <TH align="right">Mínimo</TH>
                <TH align="right">Faltante</TH>
              </TR>
            </THead>
            <TBody>
              {toRestock.products.map((producto) => {
                const faltante = Math.max(producto.minStock - producto.available, 0);
                return (
                  <TR
                    key={producto.id}
                    interactive
                    onClick={() => navigate(`/productos/${producto.id}`)}
                  >
                    <TD className="font-mono text-xs text-stone-500">{producto.sku}</TD>
                    <TD className="font-medium text-stone-900">{producto.name}</TD>
                    <TD align="right" numeric>
                      <span
                        className={producto.available <= 0 ? "font-medium text-red-600" : undefined}
                      >
                        {formatQuantity(producto.available)}
                      </span>
                    </TD>
                    <TD align="right" numeric className="text-stone-500">
                      {formatQuantity(producto.minStock)}
                    </TD>
                    <TD align="right" numeric className="text-amber-700">
                      {formatQuantity(faltante)}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}

        <p className="px-6 py-4 text-xs text-stone-400 sm:px-8">
          «Faltante» es simplemente mínimo menos disponible. No es una cantidad sugerida de
          compra: no tiene en cuenta consumo, estacionalidad ni plazos de entrega.
        </p>
      </Card>
    </div>
  );
}
