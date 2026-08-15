import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Card,
  CardHeader,
  EmptyState,
  LoadingBlock,
  Pagination,
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import { PERMISSIONS, useAuth } from "@/features/auth";
import { getApiErrorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDateTime, formatMoney, formatQuantity, toNumber } from "@/lib/format";
import { useStockMovements } from "./api";
import { MOVEMENT_LABELS, type MovementsQuery, type MovementType } from "./types";

const PAGE_SIZE = 10;

/** Los tipos que se ven en el día a día del vivero, en ese orden. */
const TIPOS_FRECUENTES: MovementType[] = [
  "SALE",
  "PURCHASE",
  "ADJUSTMENT",
  "RETURN",
  "LOSS",
  "DEATH",
  "BREAKAGE",
  "TRANSFER_IN",
  "TRANSFER_OUT",
];

function TipoBadge({ type }: { type: MovementType }) {
  const etiqueta = MOVEMENT_LABELS[type] ?? type;
  if (type === "ADJUSTMENT") return <Badge tone="brand">{etiqueta}</Badge>;
  if (type === "PURCHASE" || type === "RETURN" || type === "TRANSFER_IN") {
    return <Badge tone="success">{etiqueta}</Badge>;
  }
  if (type === "SALE" || type === "TRANSFER_OUT") return <Badge tone="info">{etiqueta}</Badge>;
  if (type === "LOSS" || type === "DEATH" || type === "DISEASE" || type === "BREAKAGE") {
    return <Badge tone="danger">{etiqueta}</Badge>;
  }
  return <Badge>{etiqueta}</Badge>;
}

/**
 * Libro mayor del producto: qué entró, qué salió y por qué.
 *
 * Es solo lectura por diseño del backend — no existe endpoint para crear
 * movimientos a mano: los genera cada operación (venta, recepción,
 * ajuste). Si algo está mal, se corrige con un ajuste, no editando el
 * historial.
 */
export function MovementsCard({ productId }: { productId: number }) {
  const { can } = useAuth();
  const verCostos = can(PERMISSIONS.PRODUCTS_VIEW_COST);

  const [tipo, setTipo] = useState<MovementType | "">("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [tipo]);

  const query = useMemo<MovementsQuery>(
    () => ({ productId, page, pageSize: PAGE_SIZE, ...(tipo !== "" ? { type: tipo } : {}) }),
    [productId, page, tipo]
  );

  const { data, isPending, error } = useStockMovements(query);

  return (
    <Card flush>
      <div className="p-6 sm:p-8">
        <CardHeader
          title="Movimientos"
          description="Todo lo que entró y salió, del más reciente al más viejo."
          action={
            <div className="w-56">
              <Select
                aria-label="Filtrar por tipo de movimiento"
                value={tipo}
                onChange={(event) => setTipo(event.target.value as MovementType | "")}
              >
                <option value="">Todos los tipos</option>
                {TIPOS_FRECUENTES.map((valor) => (
                  <option key={valor} value={valor}>
                    {MOVEMENT_LABELS[valor]}
                  </option>
                ))}
              </Select>
            </div>
          }
        />
      </div>

      {error !== null ? (
        <Alert tone="danger" className="mx-6 mb-6">
          {getApiErrorMessage(error)}
        </Alert>
      ) : isPending ? (
        <LoadingBlock label="Cargando movimientos…" />
      ) : data.items.length === 0 ? (
        <EmptyState
          title="Todavía no hay movimientos"
          description={
            tipo === ""
              ? "Cuando se compre, se venda o se ajuste este producto va a aparecer acá."
              : "Este producto no tiene movimientos de ese tipo."
          }
        />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Fecha</TH>
                <TH>Tipo</TH>
                <TH align="right">Cantidad</TH>
                <TH align="right">Saldo del lote</TH>
                <TH>Lote</TH>
                {verCostos && <TH align="right">Costo</TH>}
                <TH>Motivo</TH>
              </TR>
            </THead>

            <TBody>
              {data.items.map((movimiento) => {
                const cantidad = toNumber(movimiento.quantity);

                return (
                  <TR key={movimiento.id}>
                    <TD className="text-stone-600">
                      {formatDateTime(movimiento.createdAt)}
                      <span className="block text-xs text-stone-400">
                        {movimiento.user.username}
                      </span>
                    </TD>

                    <TD>
                      <TipoBadge type={movimiento.type} />
                    </TD>

                    <TD align="right" numeric>
                      <span
                        className={cn(
                          "font-medium",
                          cantidad < 0 ? "text-red-600" : "text-emerald-700"
                        )}
                      >
                        {cantidad > 0 ? "+" : "−"}
                        {formatQuantity(Math.abs(cantidad))}
                      </span>
                    </TD>

                    <TD align="right" numeric className="text-stone-500">
                      {formatQuantity(movimiento.stockBefore)} →{" "}
                      <span className="text-stone-800">
                        {formatQuantity(movimiento.stockAfter)}
                      </span>
                    </TD>

                    <TD className="font-mono text-xs text-stone-500">
                      {movimiento.batch?.code ?? "—"}
                    </TD>

                    {verCostos && (
                      <TD align="right" numeric className="text-stone-500">
                        {movimiento.unitCost == null ? "—" : formatMoney(movimiento.unitCost)}
                      </TD>
                    )}

                    <TD className="text-stone-600">
                      {movimiento.reason ?? "—"}
                      {movimiento.notes !== null && (
                        <span className="block text-xs text-stone-400">{movimiento.notes}</span>
                      )}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>

          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onPageChange={setPage}
          />
        </>
      )}
    </Card>
  );
}
