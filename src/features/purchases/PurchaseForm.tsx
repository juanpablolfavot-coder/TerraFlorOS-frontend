import { useMemo, useState, type FormEvent } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  Input,
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Textarea,
} from "@/components/ui";
import { useAuth } from "@/features/auth";
import { useProducts } from "@/features/products/api";
import { getApiErrorMessage } from "@/lib/api";
import { formatMoney, toNumber } from "@/lib/format";
import { useDebouncedValue } from "@/lib/hooks";
import { cn } from "@/lib/cn";
import { useSuppliers } from "./api";
import type { CreatePurchaseBody, PurchaseDetail } from "./types";

const NUM_INPUT =
  "w-28 rounded-lg bg-white px-3 py-2 text-right text-sm tabular ring-1 ring-stone-300 " +
  "ring-inset focus:ring-2 focus:ring-brand-600 focus:outline-none";

interface LineaCompra {
  key: string;
  productId: number;
  sku: string;
  name: string;
  unit: string;
  quantity: string;
  unitCost: string;
  /** Último costo conocido del producto, para avisar si sube fuerte. */
  previousCost: number | null;
}

let proximaLinea = 0;
const nuevaKey = () => `linea-${(proximaLinea += 1)}`;

const num = (valor: string): number => {
  const n = Number(valor.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

function lineasIniciales(compra: PurchaseDetail | null): LineaCompra[] {
  if (compra === null) return [];
  return compra.items.map((item) => ({
    key: nuevaKey(),
    productId: item.productId,
    sku: item.product.sku,
    name: item.product.name,
    unit: item.product.unit,
    quantity: String(toNumber(item.quantity)),
    unitCost: String(toNumber(item.unitCost)),
    previousCost: item.previousCost === null ? null : toNumber(item.previousCost),
  }));
}

export function PurchaseForm({
  compra,
  guardando,
  errorServidor,
  /** Umbral de alerta de suba de costo, en porcentaje. */
  alertaPct,
  onSubmit,
  onCancel,
}: {
  compra: PurchaseDetail | null;
  guardando: boolean;
  errorServidor: unknown;
  alertaPct: number;
  onSubmit: (body: CreatePurchaseBody) => void;
  onCancel: () => void;
}) {
  const { user } = useAuth();
  const proveedores = useSuppliers();

  const [supplierId, setSupplierId] = useState(
    compra?.supplierId != null ? String(compra.supplierId) : ""
  );
  const [expectedDate, setExpectedDate] = useState(compra?.expectedDate?.slice(0, 10) ?? "");
  const [discount, setDiscount] = useState(String(toNumber(compra?.discount ?? 0)));
  const [taxes, setTaxes] = useState(String(toNumber(compra?.taxes ?? 0)));
  const [freightCost, setFreightCost] = useState(String(toNumber(compra?.freightCost ?? 0)));
  const [otherCosts, setOtherCosts] = useState(String(toNumber(compra?.otherCosts ?? 0)));
  const [paymentTerms, setPaymentTerms] = useState(compra?.paymentTerms ?? "");
  const [notes, setNotes] = useState(compra?.notes ?? "");
  const [lineas, setLineas] = useState<LineaCompra[]>(() => lineasIniciales(compra));

  const [busqueda, setBusqueda] = useState("");
  const busquedaDebounced = useDebouncedValue(busqueda, 300);
  const resultados = useProducts({
    page: 1,
    pageSize: 8,
    isActive: true,
    sortBy: "name",
    sortDir: "asc",
    ...(busquedaDebounced.trim().length >= 2 ? { search: busquedaDebounced.trim() } : {}),
  });

  const agregar = (producto: {
    id: number;
    sku: string;
    name: string;
    unit: string;
    lastCost?: string | number;
  }) => {
    setLineas((previas) => {
      if (previas.some((l) => l.productId === producto.id)) return previas;
      const ultimo = producto.lastCost === undefined ? null : toNumber(producto.lastCost);
      return [
        ...previas,
        {
          key: nuevaKey(),
          productId: producto.id,
          sku: producto.sku,
          name: producto.name,
          unit: producto.unit,
          quantity: "1",
          unitCost: ultimo !== null && ultimo > 0 ? String(ultimo) : "",
          previousCost: ultimo,
        },
      ];
    });
    setBusqueda("");
  };

  const totales = useMemo(() => {
    // Mismo cálculo que el backend; su respuesta sigue siendo la verdad.
    const subtotal = round2(lineas.reduce((s, l) => s + num(l.quantity) * num(l.unitCost), 0));
    const total = round2(
      subtotal - num(discount) + num(taxes) + num(freightCost) + num(otherCosts)
    );
    return { subtotal, total };
  }, [lineas, discount, taxes, freightCost, otherCosts]);

  const sinSucursal = user?.branchId == null;
  const puedeGuardar =
    supplierId !== "" &&
    lineas.length > 0 &&
    lineas.every((l) => num(l.quantity) > 0 && num(l.unitCost) >= 0) &&
    totales.total >= 0 &&
    !sinSucursal;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!puedeGuardar || user?.branchId == null) return;

    onSubmit({
      branchId: user.branchId,
      supplierId: Number(supplierId),
      expectedDate: expectedDate === "" ? null : expectedDate,
      discount: num(discount),
      taxes: num(taxes),
      freightCost: num(freightCost),
      otherCosts: num(otherCosts),
      paymentTerms: paymentTerms.trim() === "" ? null : paymentTerms.trim(),
      notes: notes.trim() === "" ? null : notes.trim(),
      items: lineas.map((l) => ({
        productId: l.productId,
        quantity: num(l.quantity),
        unitCost: num(l.unitCost),
      })),
    });
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {sinSucursal && (
        <Alert tone="warning" title="Tu usuario no tiene sucursal asignada">
          La orden de compra se carga contra una sucursal y el backend la exige. Pedile a un
          administrador que te asigne una.
        </Alert>
      )}

      <Card className="space-y-6">
        <CardHeader title="Datos de la orden" />

        <div className="grid gap-5 sm:grid-cols-2">
          <Select
            label="Proveedor"
            required
            value={supplierId}
            onChange={(event) => setSupplierId(event.target.value)}
            disabled={proveedores.isPending}
          >
            <option value="">Elegí un proveedor…</option>
            {(proveedores.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.tradeName ?? p.legalName}
              </option>
            ))}
          </Select>

          <Input
            label="Fecha esperada"
            type="date"
            value={expectedDate}
            onChange={(event) => setExpectedDate(event.target.value)}
          />

          <Input
            label="Condiciones de pago"
            value={paymentTerms}
            onChange={(event) => setPaymentTerms(event.target.value)}
            placeholder="Ej: 30 días fecha factura"
          />

          <Textarea
            label="Notas"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>
      </Card>

      <Card flush>
        <div className="space-y-5 p-6 sm:p-8">
          <CardHeader
            title="Productos"
            description="Buscá el producto, poné cantidad y costo unitario."
          />

          <div className="relative">
            <Input
              aria-label="Buscar producto"
              placeholder="Buscar por nombre o SKU…"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
            />

            {busquedaDebounced.trim().length >= 2 && (
              <div className="mt-2 overflow-hidden rounded-lg border border-stone-200 bg-white">
                {(resultados.data?.items ?? []).length === 0 ? (
                  <p className="px-4 py-5 text-center text-sm text-stone-500">
                    Ningún producto coincide.
                  </p>
                ) : (
                  <ul className="divide-y divide-stone-100">
                    {(resultados.data?.items ?? []).map((producto) => (
                      <li key={producto.id}>
                        <button
                          type="button"
                          onClick={() => agregar(producto)}
                          className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-stone-50"
                        >
                          <span>
                            <span className="block font-medium text-stone-900">
                              {producto.name}
                            </span>
                            <span className="font-mono text-xs text-stone-500">{producto.sku}</span>
                          </span>
                          <span className="text-sm text-stone-400">Agregar</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>

        {lineas.length === 0 ? (
          <p className="px-6 pb-8 text-center text-sm text-stone-500">
            Todavía no agregaste productos a la orden.
          </p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Producto</TH>
                <TH align="right">Cantidad</TH>
                <TH align="right">Costo unit.</TH>
                <TH align="right">Costo anterior</TH>
                <TH align="right">Subtotal</TH>
                <TH align="right">
                  <span className="sr-only">Quitar</span>
                </TH>
              </TR>
            </THead>
            <TBody>
              {lineas.map((linea) => {
                const costo = num(linea.unitCost);
                const subida =
                  linea.previousCost !== null && linea.previousCost > 0 && costo > linea.previousCost
                    ? round2((costo / linea.previousCost - 1) * 100)
                    : null;
                const alerta = subida !== null && subida > alertaPct;

                return (
                  <TR key={linea.key}>
                    <TD>
                      <span className="font-medium text-stone-900">{linea.name}</span>
                      <span className="block font-mono text-xs text-stone-500">{linea.sku}</span>
                    </TD>

                    <TD align="right">
                      <input
                        type="text"
                        inputMode="decimal"
                        className={NUM_INPUT}
                        aria-label={`Cantidad de ${linea.name}`}
                        value={linea.quantity}
                        onChange={(event) =>
                          setLineas((previas) =>
                            previas.map((l) =>
                              l.key === linea.key ? { ...l, quantity: event.target.value } : l
                            )
                          )
                        }
                      />
                    </TD>

                    <TD align="right">
                      <input
                        type="text"
                        inputMode="decimal"
                        className={cn(NUM_INPUT, alerta && "ring-amber-400")}
                        aria-label={`Costo unitario de ${linea.name}`}
                        value={linea.unitCost}
                        onChange={(event) =>
                          setLineas((previas) =>
                            previas.map((l) =>
                              l.key === linea.key ? { ...l, unitCost: event.target.value } : l
                            )
                          )
                        }
                      />
                    </TD>

                    <TD align="right" numeric className="text-stone-500">
                      {linea.previousCost === null || linea.previousCost === 0 ? (
                        "—"
                      ) : (
                        <span className="flex items-center justify-end gap-2">
                          {formatMoney(linea.previousCost)}
                          {alerta && <Badge tone="warning">+{subida?.toFixed(1)} %</Badge>}
                        </span>
                      )}
                    </TD>

                    <TD align="right" numeric className="font-medium text-stone-900">
                      {formatMoney(num(linea.quantity) * costo)}
                    </TD>

                    <TD align="right">
                      <button
                        type="button"
                        aria-label={`Quitar ${linea.name}`}
                        onClick={() =>
                          setLineas((previas) => previas.filter((l) => l.key !== linea.key))
                        }
                        className="rounded-md p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.6}
                          strokeLinecap="round"
                          className="size-4"
                          aria-hidden="true"
                        >
                          <path d="m6 6 12 12M18 6 6 18" />
                        </svg>
                      </button>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>

      <Card className="space-y-6">
        <CardHeader
          title="Totales"
          description="El backend recalcula el total al guardar; esto es la vista previa."
        />

        <div className="grid gap-5 sm:grid-cols-4">
          <Input
            label="Descuento"
            inputMode="decimal"
            value={discount}
            onChange={(event) => setDiscount(event.target.value)}
          />
          <Input
            label="Impuestos"
            inputMode="decimal"
            value={taxes}
            onChange={(event) => setTaxes(event.target.value)}
          />
          <Input
            label="Flete"
            inputMode="decimal"
            value={freightCost}
            onChange={(event) => setFreightCost(event.target.value)}
          />
          <Input
            label="Otros costos"
            inputMode="decimal"
            value={otherCosts}
            onChange={(event) => setOtherCosts(event.target.value)}
          />
        </div>

        <dl className="space-y-2 border-t border-stone-100 pt-5 text-sm">
          <div className="flex justify-between text-stone-500">
            <dt>Subtotal</dt>
            <dd className="tabular">{formatMoney(totales.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="font-medium text-stone-700">Total</dt>
            <dd className="tabular text-lg font-semibold text-stone-900">
              {formatMoney(totales.total)}
            </dd>
          </div>
        </dl>

        {totales.total < 0 && (
          <Alert tone="danger">
            El total no puede ser negativo: revisá el descuento.
          </Alert>
        )}
      </Card>

      {errorServidor !== null && errorServidor !== undefined && (
        <Alert tone="danger" title="No se pudo guardar la compra">
          {getApiErrorMessage(errorServidor)}
        </Alert>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" loading={guardando} disabled={!puedeGuardar}>
          {compra === null ? "Crear orden" : "Guardar cambios"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={guardando}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
