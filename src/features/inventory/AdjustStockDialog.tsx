import { useState } from "react";
import { Alert, Button, Field, Input, Modal, Select, Spinner, Textarea } from "@/components/ui";
import { PERMISSIONS, useAuth } from "@/features/auth";
import { usePermiteStockNegativo } from "@/features/settings/api";
import { getApiErrorMessage } from "@/lib/api";
import { formatQuantity, formatQuantityWithUnit } from "@/lib/format";
import { conflictoDeStock, useCreateAdjustment } from "./api";
import { AppliedList } from "./AppliedList";
import type { AdjustmentResult, ProductStock } from "./types";

type Modo = "entrada" | "salida";

/** Coma o punto: la gente escribe "1,5" tanto como "1.5". */
const num = (valor: string): number => {
  const n = Number(valor.trim().replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
};

/**
 * Ajuste manual de stock.
 *
 * Va en dos pasos —carga y confirmación— porque el ajuste mueve stock
 * real y deja movimientos: no se deshace desde acá, se corrige con otro
 * ajuste en sentido contrario.
 *
 * La entrada NO es simplemente "sumar": si el producto arrastra
 * sobreventa, el backend cancela primero esa deuda y recién el excedente
 * crea un lote nuevo. Por eso el resultado muestra qué hizo con cada lote
 * y el disponible se vuelve a leer del servidor en vez de calcularlo acá.
 */
export function AdjustStockDialog({
  open,
  stock,
  refrescando,
  onClose,
}: {
  open: boolean;
  stock: ProductStock;
  /** El detalle se está releyendo tras el ajuste. */
  refrescando: boolean;
  onClose: () => void;
}) {
  const { can } = useAuth();
  const ajustar = useCreateAdjustment();

  // Leer la configuración exige sales.create o settings.manage: sin eso
  // no se pide y se asume el comportamiento estricto.
  const permiteNegativo = usePermiteStockNegativo(
    can(PERMISSIONS.SALES_CREATE) || can(PERMISSIONS.SETTINGS_MANAGE)
  );

  const [modo, setModo] = useState<Modo>("entrada");
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState("");
  const [notas, setNotas] = useState("");
  const [costo, setCosto] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [resultado, setResultado] = useState<AdjustmentResult | null>(null);

  const producto = stock.product;
  const disponible = stock.totals.available;
  const cantidadNum = num(cantidad);
  const costoNum = costo.trim() === "" ? null : num(costo);

  const errorCantidad =
    cantidad.trim() === ""
      ? "Poné cuántas unidades entran o salen"
      : !Number.isFinite(cantidadNum) || cantidadNum <= 0
        ? "Tiene que ser un número mayor que cero"
        : undefined;

  const errorMotivo =
    motivo.trim().length < 3 ? "El motivo es obligatorio (mínimo 3 caracteres)" : undefined;

  const errorCosto =
    costoNum !== null && (!Number.isFinite(costoNum) || costoNum < 0)
      ? "El costo no puede ser negativo"
      : undefined;

  const valido = errorCantidad === undefined && errorMotivo === undefined && errorCosto === undefined;

  /** Signo del ajuste, tal como lo espera el backend. */
  const delta = modo === "entrada" ? cantidadNum : -cantidadNum;
  const dejaNegativo = modo === "salida" && Number.isFinite(cantidadNum) && cantidadNum > disponible;

  const confirmar = () => {
    ajustar.mutate(
      {
        productId: producto.id,
        quantity: delta,
        reason: motivo.trim(),
        ...(notas.trim() !== "" ? { notes: notas.trim() } : {}),
        // El costo solo tiene sentido en las entradas: es el costo del
        // lote que se crea. En una salida el backend lo ignora.
        ...(modo === "entrada" && costoNum !== null ? { unitCost: costoNum } : {}),
      },
      {
        onSuccess: (respuesta) => {
          setResultado(respuesta);
          setConfirmando(false);
        },
        onError: () => setConfirmando(false),
      }
    );
  };

  const conflicto = conflictoDeStock(ajustar.error);

  // ------------------------------------------------------------------
  // Resultado
  // ------------------------------------------------------------------
  if (resultado !== null) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title="Ajuste registrado"
        description="Quedó asentado en los movimientos del producto."
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
                {formatQuantityWithUnit(disponible, producto.unit)}
              </p>
            )}
          </div>

          <AppliedList applied={resultado.applied} unit={producto.unit} />
        </div>
      </Modal>
    );
  }

  // ------------------------------------------------------------------
  // Confirmación
  // ------------------------------------------------------------------
  if (confirmando) {
    return (
      <Modal
        open={open}
        onClose={() => setConfirmando(false)}
        title="¿Confirmar el ajuste?"
        description="Mueve stock real y queda registrado. Para revertirlo hay que hacer otro ajuste."
        className="max-w-md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setConfirmando(false)}
              disabled={ajustar.isPending}
            >
              Volver
            </Button>
            <Button onClick={confirmar} loading={ajustar.isPending} autoFocus>
              Sí, ajustar
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-sm text-stone-600">
          <p>
            {modo === "entrada" ? "Vas a cargar " : "Vas a descontar "}
            <strong className="text-stone-900">
              {formatQuantityWithUnit(cantidadNum, producto.unit)}
            </strong>{" "}
            de <strong className="text-stone-900">{producto.name}</strong>.
          </p>
          <p>
            Motivo: <span className="text-stone-900">{motivo.trim()}</span>
          </p>
          <p className="text-stone-500">
            Disponible actual: {formatQuantity(disponible)} · después del ajuste:{" "}
            <span className="tabular">{formatQuantity(disponible + delta)}</span>
          </p>
        </div>
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
      title={`Ajustar stock · ${producto.name}`}
      description="Para corregir diferencias de conteo, roturas o mercadería que apareció."
      className="max-w-lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => setConfirmando(true)} disabled={!valido}>
            Revisar ajuste
          </Button>
        </>
      }
    >
      {/* noValidate: los mensajes los damos nosotros, en castellano */}
      <form
        noValidate
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (valido) setConfirmando(true);
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Tipo de ajuste"
            value={modo}
            onChange={(event) => setModo(event.target.value as Modo)}
            hint={modo === "entrada" ? "Suma stock" : "Descuenta stock"}
          >
            <option value="entrada">Entrada (+)</option>
            <option value="salida">Salida (−)</option>
          </Select>

          <Input
            label="Cantidad"
            required
            inputMode="decimal"
            placeholder="0"
            value={cantidad}
            onChange={(event) => setCantidad(event.target.value)}
            error={cantidad.trim() === "" ? undefined : errorCantidad}
            hint={`En ${producto.unit}. Hoy hay ${formatQuantity(disponible)}.`}
          />
        </div>

        <Input
          label="Motivo"
          required
          maxLength={300}
          placeholder="Diferencia de conteo, rotura, mercadería encontrada…"
          value={motivo}
          onChange={(event) => setMotivo(event.target.value)}
          error={motivo === "" ? undefined : errorMotivo}
          hint="Queda en el movimiento: es lo que se lee después al revisar el historial."
        />

        {modo === "entrada" && (
          <Field label="Costo unitario (opcional)" htmlFor="ajuste-costo" error={errorCosto}
            hint="Si lo dejás vacío se usa el costo promedio del producto.">
            <Input
              id="ajuste-costo"
              inputMode="decimal"
              placeholder="0,00"
              value={costo}
              onChange={(event) => setCosto(event.target.value)}
            />
          </Field>
        )}

        <Textarea
          label="Notas (opcional)"
          rows={2}
          maxLength={1000}
          value={notas}
          onChange={(event) => setNotas(event.target.value)}
        />

        {dejaNegativo && (
          <Alert
            tone={permiteNegativo ? "warning" : "danger"}
            title="La salida supera el disponible"
          >
            {permiteNegativo
              ? "Lo que falte va a quedar como sobreventa (stock en negativo), igual que en una venta sin stock."
              : "La configuración no permite stock negativo, así que el servidor va a rechazar el ajuste."}
          </Alert>
        )}

        {ajustar.error !== null && (
          <Alert tone="danger" title="No se pudo registrar el ajuste">
            {conflicto !== null
              ? `Se pidieron ${formatQuantity(conflicto.requested)} y hay ${formatQuantity(
                  conflicto.available
                )} disponibles.`
              : getApiErrorMessage(ajustar.error)}
          </Alert>
        )}

        {/* Enviar con Enter sin duplicar el botón visible del pie */}
        <button type="submit" className="hidden" tabIndex={-1} aria-hidden="true" />
      </form>
    </Modal>
  );
}
