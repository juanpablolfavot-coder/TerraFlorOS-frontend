import {
  Alert,
  Badge,
  Card,
  CardHeader,
  EmptyState,
  LoadingBlock,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import { useNavigate } from "react-router-dom";
import { useSales } from "@/features/sales/api";
import { getApiErrorMessage } from "@/lib/api";
import { formatDateTime, formatMoney } from "@/lib/format";

/** Ventas asociadas al cliente (`GET /api/sales?customerId=`). */
export function CustomerSalesCard({ customerId }: { customerId: number }) {
  const navigate = useNavigate();
  const ventas = useSales({ customerId, pageSize: 20 });

  return (
    <Card flush>
      <div className="p-6 sm:p-8">
        <CardHeader
          title="Compras del cliente"
          description="Las ventas que se le facturaron, de la más reciente a la más vieja."
        />
      </div>

      {ventas.isPending ? (
        <LoadingBlock label="Cargando compras…" />
      ) : ventas.error !== null ? (
        <Alert tone="danger" className="mx-6 mb-6">
          {getApiErrorMessage(ventas.error)}
        </Alert>
      ) : (ventas.data?.items.length ?? 0) === 0 ? (
        <EmptyState
          title="Todavía no le vendiste nada"
          description="Cuando lo elijas en el POS, la venta va a aparecer acá."
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Comprobante</TH>
              <TH>Fecha</TH>
              <TH>Ítems</TH>
              <TH align="right">Total</TH>
            </TR>
          </THead>
          <TBody>
            {(ventas.data?.items ?? []).map((venta) => (
              <TR key={venta.id} interactive onClick={() => navigate(`/ventas/${venta.id}`)}>
                <TD className="font-mono text-xs text-stone-500">
                  {venta.number}
                  {venta.status === "VOIDED" && (
                    <Badge tone="danger" className="ml-2">
                      Anulada
                    </Badge>
                  )}
                </TD>
                <TD className="text-stone-600">{formatDateTime(venta.createdAt)}</TD>
                <TD className="text-stone-500">{venta._count?.items ?? "—"}</TD>
                <TD align="right" numeric className="font-medium text-stone-900">
                  {formatMoney(venta.total)}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </Card>
  );
}
