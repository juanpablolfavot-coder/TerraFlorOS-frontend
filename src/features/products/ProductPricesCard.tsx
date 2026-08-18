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
import { useRedondeoPrecios } from "@/features/settings/api";
import { getApiErrorMessage } from "@/lib/api";
import { formatDateTime, formatMoney, toNumber } from "@/lib/format";
import { cn } from "@/lib/cn";
import { usePriceHistory, useSavePrices } from "./api";
import {
  aTexto,
  filaConMargen,
  filaConPrecio,
  margenDesdePrecio,
  numeroDe,
  type FilaPrecio,
} from "./pricing";
import type { ProductDetail } from "./types";

const PRICE_INPUT =
  "w-32 rounded-lg bg-white px-3 py-2 text-right text-sm tabular ring-1 ring-stone-300 " +
  "ring-inset placeholder:text-stone-300 focus:ring-2 focus:ring-brand-600 focus:outline-none " +
  "disabled:bg-stone-50 disabled:text-stone-400";

const MARGIN_INPUT = PRICE_INPUT.replace("w-32", "w-24");

/** El campo que se calculó solo lleva un tinte suave, para distinguirlo del fijado a mano. */
const CALCULADO = "bg-brand-50/50";

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
 * Costo y precio de un producto ya creado. El costo es SOLO lectura (se
 * mueve por compras/recepciones/ajustes, nunca desde el catálogo); los
 * precios se editan por lista con margen ↔ precio bidireccional: escribís
 * el margen y sale el precio, o escribís el precio y sale el margen. La
 * fórmula (margen sobre costo) vive en `pricing.ts`.
 */
export function ProductPricesCard({ producto }: { producto: ProductDetail }) {
  const { can } = useAuth();
  const puedeEditar = can(PERMISSIONS.PRICES_EDIT);
  const verCostos = can(PERMISSIONS.PRODUCTS_VIEW_COST);

  const listas = usePriceLists();
  const guardar = useSavePrices(producto.id);
  const redondeo = useRedondeoPrecios();

  const [borradores, setBorradores] = useState<Record<number, FilaPrecio>>({});
  const [historialDe, setHistorialDe] = useState<number | null>(null);
  const [historialAbierto, setHistorialAbierto] = useState(false);

  // Al recargar el producto, los borradores sin guardar se descartan
  useEffect(() => {
    setBorradores({});
  }, [producto.updatedAt]);

  // El margen se calcula sobre el costo promedio (visible solo con view_cost)
  const costo = toNumber(producto.averageCost);
  const hayCosto = verCostos && costo > 0;

  const precioActual = (priceListId: number): string => {
    const fila = producto.prices.find((p) => p.priceListId === priceListId);
    // Con coma decimal, igual que como se tipea
    return fila === undefined ? "" : aTexto(toNumber(fila.price));
  };

  /** Fila mostrada: el borrador si se tocó, si no la derivada del precio guardado. */
  const filaDe = (priceListId: number): FilaPrecio => {
    const borrador = borradores[priceListId];
    if (borrador !== undefined) return borrador;

    const precio = precioActual(priceListId);
    const n = numeroDe(precio);
    const pct = n !== null && hayCosto ? margenDesdePrecio(costo, n) : null;
    return { precio, margen: pct === null ? "" : aTexto(pct), fijado: null };
  };

  const cambiarMargen = (priceListId: number, texto: string) =>
    setBorradores((previos) => ({
      ...previos,
      [priceListId]: filaConMargen(filaDe(priceListId), texto, hayCosto ? costo : null, redondeo),
    }));

  const cambiarPrecio = (priceListId: number, texto: string) =>
    setBorradores((previos) => ({
      ...previos,
      [priceListId]: filaConPrecio(texto, hayCosto ? costo : null),
    }));

  const cambiados = Object.entries(borradores).filter(([id, fila]) => {
    const nuevo = numeroDe(fila.precio);
    return nuevo !== null && nuevo >= 0 && nuevo !== numeroDe(precioActual(Number(id)));
  });

  const guardarCambios = () => {
    const body = cambiados.map(([id, fila]) => ({
      priceListId: Number(id),
      price: numeroDe(fila.precio) ?? 0,
    }));

    if (body.length === 0) return;
    guardar.mutate(body, { onSuccess: () => setBorradores({}) });
  };

  return (
    <Card flush>
      <div className="flex flex-wrap items-start justify-between gap-4 p-6 sm:p-8">
        <CardHeader
          title="Costo y precio"
          description={
            puedeEditar
              ? "Escribí el margen o el precio: el otro se calcula solo. Cada cambio queda en el historial."
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

      {/* Costos: solo lectura y solo con view_cost. Desde el catálogo no
          se editan: se mueven por compras, recepciones y ajustes. */}
      {verCostos && (
        <dl className="flex flex-wrap gap-x-12 gap-y-4 border-t border-stone-100 px-6 py-5 sm:px-8">
          <div className="space-y-1">
            <dt className="text-sm text-stone-500">Costo promedio</dt>
            <dd className="tabular text-lg font-semibold">{formatMoney(producto.averageCost)}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-sm text-stone-500">Último costo</dt>
            <dd className="tabular text-lg font-semibold">{formatMoney(producto.lastCost)}</dd>
          </div>
          <p className="max-w-56 self-center text-xs text-stone-400">
            Se actualizan solos con compras, recepciones y ajustes; acá no se editan.
          </p>
        </dl>
      )}

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
                {verCostos && <TH align="right">Margen %</TH>}
                {verCostos && <TH align="center" aria-hidden="true">⇄</TH>}
                <TH align="right">Precio</TH>
                <TH align="right">Última actualización</TH>
              </TR>
            </THead>
            <TBody>
              {(listas.data ?? []).map((lista) => {
                const guardada = producto.prices.find((p) => p.priceListId === lista.id);
                const fila = filaDe(lista.id);

                return (
                  <TR key={lista.id}>
                    <TD>
                      <span className="flex items-center gap-2">
                        <span className="font-medium text-stone-900">{lista.name}</span>
                        {lista.isDefault && <Badge tone="brand">Por defecto</Badge>}
                      </span>
                    </TD>

                    {verCostos && (
                      <TD align="right">
                        <input
                          type="text"
                          inputMode="decimal"
                          className={cn(MARGIN_INPUT, fila.fijado === "precio" && CALCULADO)}
                          aria-label={`Margen en ${lista.name}`}
                          placeholder={hayCosto ? "0" : "Sin costo"}
                          disabled={!puedeEditar || !hayCosto}
                          title={hayCosto ? undefined : "Sin costo no se puede calcular el margen."}
                          value={fila.margen}
                          onChange={(event) => cambiarMargen(lista.id, event.target.value)}
                        />
                      </TD>
                    )}

                    {verCostos && (
                      <TD align="center" className="text-stone-300" aria-hidden="true">
                        ⇄
                      </TD>
                    )}

                    <TD align="right">
                      <input
                        type="text"
                        inputMode="decimal"
                        className={cn(PRICE_INPUT, fila.fijado === "margen" && CALCULADO)}
                        aria-label={`Precio en ${lista.name}`}
                        placeholder="Sin precio"
                        disabled={!puedeEditar}
                        value={fila.precio}
                        onChange={(event) => cambiarPrecio(lista.id, event.target.value)}
                      />
                    </TD>

                    <TD align="right" className="text-stone-500">
                      {guardada === undefined ? "—" : formatDateTime(guardada.updatedAt)}
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

          {verCostos && (
            <p className="px-6 pb-5 text-xs text-stone-400">
              {hayCosto
                ? `Margen sobre el costo promedio (${formatMoney(costo)}): precio = costo × (1 + margen/100). El campo sombreado es el calculado.`
                : "Sin costo no hay margen: el precio se carga directo."}
              {hayCosto &&
                redondeo > 0 &&
                ` Los precios calculados se redondean al múltiplo de ${redondeo} (configuración pricing.rounding).`}
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
