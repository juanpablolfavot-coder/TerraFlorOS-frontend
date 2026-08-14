import { useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Modal,
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Textarea,
} from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api";
import { formatMoney, formatQuantity, toNumber } from "@/lib/format";
import { conflictoDeRecepcion, useCreateReceipt } from "./api";
import type { PurchaseDetail, Receipt } from "./types";

const NUM_INPUT =
  "w-24 rounded-lg bg-white px-2.5 py-1.5 text-right text-sm tabular ring-1 ring-stone-300 " +
  "ring-inset focus:ring-2 focus:ring-brand-600 focus:outline-none";

const CONDICIONES = [
  { value: "ok", label: "En buen estado" },
  { value: "deteriorado", label: "Deteriorado" },
  { value: "incorrecto", label: "Incorrecto" },
];

interface LineaRecepcion {
  purchaseItemId: number;
  quantity: string;
  unitCost: string;
  condition: string;
  notes: string;
}

const num = (valor: string): number => {
  const n = Number(valor.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/**
 * Recepción de mercadería.
 *
 * Es la acción que hace NACER stock real: genera lotes y recalcula los
 * costos del producto. Por eso pide confirmación y, al terminar, muestra
 * exactamente qué pasó.
 */
export function ReceiveDialog({
  open,
  compra,
  onClose,
}: {
  open: boolean;
  compra: PurchaseDetail;
  onClose: () => void;
}) {
  const recibir = useCreateReceipt(compra.id);

  /** Lo que falta recibir de cada ítem. */
  const pendientes = compra.items
    .map((item) => ({
      item,
      pendiente: Math.round((toNumber(item.quantity) - toNumber(item.receivedQty)) * 100) / 100,
    }))
    .filter((fila) => fila.pendiente > 0);

  const [lineas, setLineas] = useState<Record<number, LineaRecepcion>>(() =>
    Object.fromEntries(
      pendientes.map(({ item, pendiente }) => [
        item.id,
        {
          purchaseItemId: item.id,
          // Por defecto se recibe todo lo que falta, al costo de la orden
          quantity: String(pendiente),
          unitCost: String(toNumber(item.unitCost)),
          condition: "ok",
          notes: "",
        },
      ])
    )
  );

  const [confirmando, setConfirmando] = useState(false);
  const [resultado, setResultado] = useState<Receipt | null>(null);
  const [notas, setNotas] = useState("");

  const set = (id: number, patch: Partial<LineaRecepcion>) =>
    setLineas((previas) => ({ ...previas, [id]: { ...previas[id]!, ...patch } }));

  /** Solo viajan las líneas con cantidad > 0. */
  const aRecibir = Object.values(lineas).filter((l) => num(l.quantity) > 0);

  const excedidos = pendientes.filter(({ item, pendiente }) => {
    const linea = lineas[item.id];
    return linea !== undefined && num(linea.quantity) > pendiente;
  });

  const puedeConfirmar = aRecibir.length > 0 && excedidos.length === 0 && !recibir.isPending;

  const confirmar = () => {
    recibir.mutate(
      {
        notes: notas.trim() === "" ? null : notas.trim(),
        items: aRecibir.map((l) => ({
          purchaseItemId: l.purchaseItemId,
          quantity: num(l.quantity),
          unitCost: num(l.unitCost),
          condition: l.condition,
        })),
      },
      {
        onSuccess: (recepcion) => {
          setResultado(recepcion);
          setConfirmando(false);
        },
        onError: () => setConfirmando(false),
      }
    );
  };

  const conflicto = conflictoDeRecepcion(recibir.error);

  // ------------------------------------------------------------------
  // Resultado: qué generó la recepción
  // ------------------------------------------------------------------
  if (resultado !== null) {
    const lotes = resultado.items.filter((i) => i.batch !== null);

    return (
      <Modal
        open={open}
        onClose={onClose}
        title="Mercadería recibida"
        description="Se generó el stock y se actualizaron los costos de los productos."
        className="max-w-2xl"
        footer={<Button onClick={onClose} autoFocus>Listo</Button>}
      >
        <div className="space-y-6">
          <Alert tone="success" title="El stock ya está disponible">
            Cada línea recibida generó un lote propio. Los costos de compra quedaron actualizados
            (último costo y promedio ponderado).
          </Alert>

          <Table>
            <THead>
              <TR>
                <TH>Producto</TH>
                <TH>Lote generado</TH>
                <TH align="right">Cantidad</TH>
                <TH align="right">Costo</TH>
              </TR>
            </THead>
            <TBody>
              {resultado.items.map((item) => (
                <TR key={item.id}>
                  <TD>
                    <span className="font-medium text-stone-900">
                      {item.product?.name ?? `Producto #${item.productId}`}
                    </span>
                    <span className="block font-mono text-xs text-stone-500">
                      {item.product?.sku ?? ""}
                    </span>
                  </TD>
                  <TD>
                    {item.batch === null ? (
                      <span className="text-stone-400">—</span>
                    ) : (
                      <Badge tone="success">{item.batch.code}</Badge>
                    )}
                  </TD>
                  <TD align="right" numeric>
                    {formatQuantity(item.quantity)}
                  </TD>
                  <TD align="right" numeric>
                    {formatMoney(item.unitCost)}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>

          {/* No se adivina el estado nuevo: el detalle ya se refrescó y lo
              muestra en el encabezado. */}
          <p className="text-sm text-stone-500">
            {lotes.length === 1 ? "Se generó 1 lote." : `Se generaron ${lotes.length} lotes.`} El
            estado de la orden quedó actualizado según lo que haya quedado pendiente: lo ves en el
            encabezado de la compra.
          </p>
        </div>
      </Modal>
    );
  }

  // ------------------------------------------------------------------
  // Confirmación: la recepción no se deshace fácil
  // ------------------------------------------------------------------
  if (confirmando) {
    return (
      <Modal
        open={open}
        onClose={() => setConfirmando(false)}
        title="¿Confirmar la recepción?"
        description="Genera lotes de stock y actualiza los costos de los productos. No se deshace desde acá."
        className="max-w-md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setConfirmando(false)}
              disabled={recibir.isPending}
            >
              Volver
            </Button>
            <Button onClick={confirmar} loading={recibir.isPending} autoFocus>
              Sí, recibir
            </Button>
          </>
        }
      >
        <p className="text-sm text-stone-600">
          Vas a recibir {aRecibir.length}{" "}
          {aRecibir.length === 1 ? "línea" : "líneas"} de la orden #{compra.id}.
        </p>
      </Modal>
    );
  }

  // ------------------------------------------------------------------
  // Carga
  // ------------------------------------------------------------------
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Recibir mercadería · orden #${compra.id}`}
      description="Por defecto viene todo lo que falta, al costo de la orden. Podés recibir solo una parte."
      className="max-w-4xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => setConfirmando(true)} disabled={!puedeConfirmar}>
            Recibir
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {pendientes.length === 0 ? (
          <Alert tone="info">Esta orden ya no tiene nada pendiente de recibir.</Alert>
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Producto</TH>
                  <TH align="right">Pedido</TH>
                  <TH align="right">Ya recibido</TH>
                  <TH align="right">A recibir</TH>
                  <TH align="right">Costo real</TH>
                  <TH>Condición</TH>
                </TR>
              </THead>
              <TBody>
                {pendientes.map(({ item, pendiente }) => {
                  const linea = lineas[item.id]!;
                  const excede = num(linea.quantity) > pendiente;

                  return (
                    <TR key={item.id}>
                      <TD>
                        <span className="font-medium text-stone-900">{item.product.name}</span>
                        <span className="block font-mono text-xs text-stone-500">
                          {item.product.sku}
                        </span>
                      </TD>
                      <TD align="right" numeric className="text-stone-500">
                        {formatQuantity(item.quantity)}
                      </TD>
                      <TD align="right" numeric className="text-stone-500">
                        {formatQuantity(item.receivedQty)}
                      </TD>
                      <TD align="right">
                        <input
                          type="text"
                          inputMode="decimal"
                          aria-label={`Cantidad a recibir de ${item.product.name}`}
                          className={NUM_INPUT}
                          value={linea.quantity}
                          onChange={(event) => set(item.id, { quantity: event.target.value })}
                        />
                        {excede && (
                          <span className="mt-1 block text-xs text-red-600">
                            Faltan {formatQuantity(pendiente)}
                          </span>
                        )}
                      </TD>
                      <TD align="right">
                        <input
                          type="text"
                          inputMode="decimal"
                          aria-label={`Costo real de ${item.product.name}`}
                          className={NUM_INPUT}
                          value={linea.unitCost}
                          onChange={(event) => set(item.id, { unitCost: event.target.value })}
                        />
                      </TD>
                      <TD>
                        <Select
                          aria-label={`Condición de ${item.product.name}`}
                          value={linea.condition}
                          onChange={(event) => set(item.id, { condition: event.target.value })}
                        >
                          {CONDICIONES.map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.label}
                            </option>
                          ))}
                        </Select>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>

            <Textarea
              label="Notas de la recepción"
              rows={2}
              value={notas}
              onChange={(event) => setNotas(event.target.value)}
            />
          </>
        )}

        {excedidos.length > 0 && (
          <Alert tone="warning" title="Hay cantidades por encima de lo pendiente">
            No se puede recibir más de lo pedido. Revisá las líneas marcadas.
          </Alert>
        )}

        {recibir.error !== null && (
          <Alert tone="danger" title="No se pudo registrar la recepción">
            {conflicto !== null
              ? `Se intentó recibir ${formatQuantity(conflicto.attempted)} de un ítem que tiene ` +
                `${formatQuantity(conflicto.ordered)} pedidos y ${formatQuantity(conflicto.alreadyReceived)} ya recibidos.`
              : getApiErrorMessage(recibir.error)}
          </Alert>
        )}
      </div>
    </Modal>
  );
}
