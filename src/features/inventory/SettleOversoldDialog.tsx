import { useState } from "react";
import { Alert, Button, Modal, Spinner, Textarea } from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api";
import { formatQuantityWithUnit } from "@/lib/format";
import { useSettleOversold } from "./api";
import { AppliedList } from "./AppliedList";
import type { AdjustmentResult, ProductStock } from "./types";

/**
 * Regularización de sobreventa.
 *
 * Es el atajo para el caso más común: se vendió mercadería que no estaba
 * cargada, y ahora hay que blanquearla. El backend calcula solo cuánto
 * debe cargar —la deuda exacta— y deja el lote de sobreventa en cero;
 * acá se muestra ese número antes de confirmar para que no sea un botón
 * a ciegas.
 */
export function SettleOversoldDialog({
  open,
  stock,
  deuda,
  refrescando,
  onClose,
}: {
  open: boolean;
  stock: ProductStock;
  /** Cantidad adeudada, en positivo. */
  deuda: number;
  refrescando: boolean;
  onClose: () => void;
}) {
  const producto = stock.product;
  const regularizar = useSettleOversold(producto.id);

  const [notas, setNotas] = useState("");
  const [resultado, setResultado] = useState<AdjustmentResult | null>(null);

  const confirmar = () => {
    regularizar.mutate(
      { ...(notas.trim() !== "" ? { notes: notas.trim() } : {}) },
      { onSuccess: setResultado }
    );
  };

  if (resultado !== null) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title="Sobreventa regularizada"
        description="El lote de sobreventa quedó en cero."
        className="max-w-lg"
        footer={
          <Button onClick={onClose} autoFocus>
            Listo
          </Button>
        }
      >
        <div className="space-y-6">
          <div className="rounded-lg bg-stone-50 p-5">
            <p className="text-sm text-stone-500">Disponible ahora</p>
            {refrescando ? (
              <p className="mt-1 flex items-center gap-2 text-sm text-stone-500">
                <Spinner size="sm" /> Actualizando…
              </p>
            ) : (
              <p className="tabular mt-1 text-2xl font-semibold text-stone-900">
                {formatQuantityWithUnit(stock.totals.available, producto.unit)}
              </p>
            )}
          </div>

          <AppliedList applied={resultado.applied} unit={producto.unit} />
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Regularizar la sobreventa"
      description="Carga exactamente lo que se debe y deja el lote de sobreventa en cero."
      className="max-w-md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={regularizar.isPending}>
            Cancelar
          </Button>
          <Button onClick={confirmar} loading={regularizar.isPending} autoFocus>
            Regularizar
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="rounded-lg bg-red-50 p-5">
          <p className="text-sm text-red-700">Deuda pendiente</p>
          <p className="tabular mt-1 text-2xl font-semibold text-red-700">
            {formatQuantityWithUnit(deuda, producto.unit)}
          </p>
        </div>

        <p className="text-sm text-stone-600">
          Se registra una entrada por esa cantidad, con el costo promedio del producto. Usalo
          cuando la mercadería ya está físicamente en el vivero: si todavía no llegó, dejala como
          deuda.
        </p>

        <Textarea
          label="Notas (opcional)"
          rows={2}
          maxLength={1000}
          value={notas}
          onChange={(event) => setNotas(event.target.value)}
        />

        {regularizar.error !== null && (
          <Alert tone="danger" title="No se pudo regularizar">
            {getApiErrorMessage(regularizar.error)}
          </Alert>
        )}
      </div>
    </Modal>
  );
}
