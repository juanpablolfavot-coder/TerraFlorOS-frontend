import { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  LoadingBlock,
  Modal,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import { PERMISSIONS, useAuth } from "@/features/auth";
import { usePriceLists } from "@/features/sales/api";
import { getApiErrorMessage } from "@/lib/api";
import { formatDateTime, formatMoney, toNumber } from "@/lib/format";
import { cn } from "@/lib/cn";
import { usePriceHistory, useSavePrices } from "./api";
import type { ProductDetail } from "./types";

const PRICE_INPUT =
  "w-32 rounded-lg bg-white px-3 py-2 text-right text-sm tabular ring-1 ring-stone-300 " +
  "ring-inset focus:ring-2 focus:ring-brand-600 focus:outline-none disabled:bg-stone-50";

/** Margen sobre el costo promedio, en porcentaje. */
function margen(precio: number, costo: number): number | null {
  if (costo <= 0 || precio <= 0) return null;
  return ((precio - costo) / precio) * 100;
}

function HistorialDialog({
  open,
  productId,
  priceListId,
  onClose,
}: {
  open: boolean;
  productId: number;
  priceListId: number | null;
  onClose: () => void;
}) {
  const historial = usePriceHistory(productId, priceListId, open);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Historial de precios"
      description="Cada cambio queda registrado, del más reciente al más viejo."
      className="max-w-2xl"
      footer={<Button onClick={onClose}>Cerrar</Button>}
    >
      {historial.isPending ? (
        <LoadingBlock label="Cargando historial…" />
      ) : historial.error !== null ? (
        <Alert tone="danger">{getApiErrorMessage(historial.error)}</Alert>
      ) : (historial.data?.items.length ?? 0) === 0 ? (
        <EmptyState
          title="Todavía no hubo cambios de precio"
          description="El historial se llena cuando se guarda un precio distinto."
        />
      ) : (
        <div className="-mx-2 max-h-96 overflow-y-auto">
          <Table>
            <THead>
              <TR>
                <TH>Fecha</TH>
                <TH>Lista</TH>
                <TH align="right">Antes</TH>
                <TH align="right">Después</TH>
              </TR>
            </THead>
            <TBody>
              {(historial.data?.items ?? []).map((entrada) => (
                <TR key={entrada.id}>
                  <TD className="text-stone-500">{formatDateTime(entrada.createdAt)}</TD>
                  <TD>{entrada.priceList ?? `Lista ${entrada.priceListId}`}</TD>
                  <TD align="right" numeric className="text-stone-500">
                    {entrada.oldPrice === null ? "—" : formatMoney(entrada.oldPrice)}
                  </TD>
                  <TD align="right" numeric className="font-medium text-stone-900">
                    {formatMoney(entrada.newPrice)}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}
    </Modal>
  );
}

/**
 * Precios por lista. Se muestran todas las listas activas, tengan o no
 * precio cargado; el PUT manda solo las que el usuario tocó.
 */
export function ProductPricesCard({ producto }: { producto: ProductDetail }) {
  const { can } = useAuth();
  const puedeEditar = can(PERMISSIONS.PRICES_EDIT);
  const verCostos = can(PERMISSIONS.PRODUCTS_VIEW_COST);

  const listas = usePriceLists();
  const guardar = useSavePrices(producto.id);

  const [borradores, setBorradores] = useState<Record<number, string>>({});
  const [historialDe, setHistorialDe] = useState<number | null>(null);
  const [historialAbierto, setHistorialAbierto] = useState(false);

  // Al recargar el producto, los borradores sin guardar se descartan
  useEffect(() => {
    setBorradores({});
  }, [producto.updatedAt]);

  const precioActual = (priceListId: number): string => {
    const fila = producto.prices.find((p) => p.priceListId === priceListId);
    return fila === undefined ? "" : String(toNumber(fila.price));
  };

  const valorDe = (priceListId: number): string =>
    borradores[priceListId] ?? precioActual(priceListId);

  const cambiados = Object.entries(borradores).filter(([id, valor]) => {
    const original = precioActual(Number(id));
    return valor.trim() !== "" && valor.trim() !== original;
  });

  const guardarCambios = () => {
    const body = cambiados
      .map(([id, valor]) => ({
        priceListId: Number(id),
        price: Number(valor.replace(",", ".")),
      }))
      .filter((item) => Number.isFinite(item.price) && item.price >= 0);

    if (body.length === 0) return;
    guardar.mutate(body, { onSuccess: () => setBorradores({}) });
  };

  const costo = toNumber(producto.averageCost);

  return (
    <Card flush>
      <div className="flex flex-wrap items-start justify-between gap-4 p-6 sm:p-8">
        <CardHeader
          title="Precios"
          description={
            puedeEditar
              ? "Un precio por lista. Cada cambio queda en el historial."
              : "Solo lectura: editar precios requiere el permiso prices.edit."
          }
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setHistorialDe(null);
            setHistorialAbierto(true);
          }}
        >
          Ver historial
        </Button>
      </div>

      {listas.isPending ? (
        <LoadingBlock label="Cargando listas de precios…" />
      ) : listas.error !== null ? (
        <Alert tone="danger" className="mx-6 mb-6">
          {getApiErrorMessage(listas.error)}
        </Alert>
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Lista</TH>
                <TH align="right">Precio</TH>
                {verCostos && <TH align="right">Margen</TH>}
                <TH align="right">Última actualización</TH>
              </TR>
            </THead>
            <TBody>
              {(listas.data ?? []).map((lista) => {
                const fila = producto.prices.find((p) => p.priceListId === lista.id);
                const valor = valorDe(lista.id);
                const numerico = Number(valor.replace(",", "."));
                const pct = verCostos ? margen(numerico, costo) : null;

                return (
                  <TR key={lista.id}>
                    <TD>
                      <span className="flex items-center gap-2">
                        <span className="font-medium text-stone-900">{lista.name}</span>
                        {lista.isDefault && <Badge tone="brand">Por defecto</Badge>}
                      </span>
                    </TD>

                    <TD align="right">
                      <input
                        type="text"
                        inputMode="decimal"
                        className={PRICE_INPUT}
                        aria-label={`Precio en ${lista.name}`}
                        placeholder="Sin precio"
                        disabled={!puedeEditar}
                        value={valor}
                        onChange={(event) =>
                          setBorradores((previos) => ({
                            ...previos,
                            [lista.id]: event.target.value,
                          }))
                        }
                      />
                    </TD>

                    {verCostos && (
                      <TD align="right" numeric>
                        {pct === null ? (
                          <span className="text-stone-400">—</span>
                        ) : (
                          <span className={cn(pct < 0 ? "text-red-600" : "text-stone-600")}>
                            {pct.toFixed(1)} %
                          </span>
                        )}
                      </TD>
                    )}

                    <TD align="right" className="text-stone-500">
                      {fila === undefined ? "—" : formatDateTime(fila.updatedAt)}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>

          {guardar.error !== null && (
            <Alert tone="danger" title="No se pudieron guardar los precios" className="mx-6 mt-6">
              {getApiErrorMessage(guardar.error)}
            </Alert>
          )}

          {puedeEditar && (
            <div className="flex items-center gap-3 border-t border-stone-200 px-6 py-4">
              <Button
                onClick={guardarCambios}
                loading={guardar.isPending}
                disabled={cambiados.length === 0}
              >
                Guardar precios
              </Button>
              <span className="text-sm text-stone-500">
                {cambiados.length === 0
                  ? "Sin cambios"
                  : `${cambiados.length} precio${cambiados.length === 1 ? "" : "s"} por guardar`}
              </span>
            </div>
          )}

          {verCostos && costo > 0 && (
            <p className="px-6 pb-5 text-xs text-stone-400">
              El margen se calcula sobre el costo promedio ({formatMoney(costo)}).
            </p>
          )}
        </>
      )}

      <HistorialDialog
        open={historialAbierto}
        productId={producto.id}
        priceListId={historialDe}
        onClose={() => setHistorialAbierto(false)}
      />
    </Card>
  );
}
