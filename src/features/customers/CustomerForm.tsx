import { useState, type FormEvent } from "react";
import { Alert, Button, Card, CardHeader, Checkbox, Input, Select, Textarea } from "@/components/ui";
import { PERMISSIONS, useAuth } from "@/features/auth";
import { usePriceLists } from "@/features/sales/api";
import { getApiErrorMessage, getApiFieldErrors } from "@/lib/api";
import { toNumber } from "@/lib/format";
import {
  customerFormSchema,
  erroresPorCampo,
  numeroAApi,
  textoAApi,
  type CustomerFormValues,
} from "./schemas";
import {
  CUSTOMER_SEGMENTS,
  SEGMENT_LABEL,
  type CreateCustomerBody,
  type CustomerDetail,
  type CustomerSegment,
} from "./types";

const texto = (valor: string | null | undefined) => valor ?? "";

function valoresIniciales(cliente: CustomerDetail | null): CustomerFormValues {
  return {
    name: texto(cliente?.name),
    phone: texto(cliente?.phone),
    whatsapp: texto(cliente?.whatsapp),
    email: texto(cliente?.email),
    taxId: texto(cliente?.taxId),
    segment: cliente?.segment ?? "ocasional",
    priceListId: cliente?.priceListId == null ? "" : String(cliente.priceListId),
    creditLimit: cliente?.creditLimit == null ? "" : String(toNumber(cliente.creditLimit)),
    notes: texto(cliente?.notes),
    isActive: cliente?.isActive ?? true,
  };
}

export function CustomerForm({
  cliente,
  guardando,
  errorServidor,
  onSubmit,
  onCancel,
}: {
  /** `null` = alta. */
  cliente: CustomerDetail | null;
  guardando: boolean;
  errorServidor: unknown;
  onSubmit: (body: CreateCustomerBody) => void;
  onCancel: () => void;
}) {
  const { can } = useAuth();
  // Las listas de precios se leen con products.view: quien no lo tenga
  // igual puede editar el cliente, pero sin tocar ese campo.
  const puedeVerListas = can(PERMISSIONS.PRODUCTS_VIEW);
  const priceLists = usePriceLists(puedeVerListas);

  const [valores, setValores] = useState<CustomerFormValues>(() => valoresIniciales(cliente));
  const [errores, setErrores] = useState<Record<string, string>>({});

  const erroresApi = getApiFieldErrors(errorServidor);
  const errorDe = (campo: string) => errores[campo] ?? erroresApi[campo];

  const set = <K extends keyof CustomerFormValues>(campo: K, valor: CustomerFormValues[K]) =>
    setValores((previos) => ({ ...previos, [campo]: valor }));

  const campo = (
    nombre: keyof CustomerFormValues & string,
    label: string,
    extra?: { hint?: string; type?: string; inputMode?: "decimal" | "tel" | "email" }
  ) => (
    <Input
      label={label}
      value={valores[nombre] as string}
      onChange={(event) => set(nombre, event.target.value as never)}
      error={errorDe(nombre)}
      hint={extra?.hint}
      type={extra?.type}
      inputMode={extra?.inputMode}
    />
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validado = customerFormSchema.safeParse(valores);
    if (!validado.success) {
      setErrores(erroresPorCampo(validado.error));
      return;
    }
    setErrores({});

    onSubmit({
      name: valores.name.trim(),
      phone: textoAApi(valores.phone),
      whatsapp: textoAApi(valores.whatsapp),
      email: textoAApi(valores.email),
      taxId: textoAApi(valores.taxId),
      segment: valores.segment,
      priceListId: valores.priceListId === "" ? null : Number(valores.priceListId),
      creditLimit: numeroAApi(valores.creditLimit),
      notes: textoAApi(valores.notes),
      isActive: valores.isActive,
    });
  };

  const listas = priceLists.data ?? [];

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      <Card className="space-y-6">
        <CardHeader title="Identificación" />

        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Nombre"
            required
            autoFocus
            value={valores.name}
            onChange={(event) => set("name", event.target.value)}
            error={errorDe("name")}
            className="sm:col-span-2"
            hint="Lo único obligatorio: el resto se completa cuando haga falta."
          />
          {campo("taxId", "CUIT")}

          <Select
            label="Segmento"
            value={valores.segment}
            onChange={(event) => set("segment", event.target.value as CustomerSegment)}
            error={errorDe("segment")}
          >
            {CUSTOMER_SEGMENTS.map((valor) => (
              <option key={valor} value={valor}>
                {SEGMENT_LABEL[valor]}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <Card className="space-y-6">
        <CardHeader title="Contacto" />

        <div className="grid gap-5 sm:grid-cols-2">
          {campo("phone", "Teléfono", { inputMode: "tel" })}
          {campo("whatsapp", "WhatsApp", { inputMode: "tel" })}
          {campo("email", "Email", { type: "email", inputMode: "email" })}
        </div>
      </Card>

      <Card className="space-y-6">
        <CardHeader
          title="Condiciones comerciales"
          description="La lista asignada es la que el POS va a usar al facturarle."
        />

        <div className="grid gap-5 sm:grid-cols-2">
          {puedeVerListas ? (
            <Select
              label="Lista de precios"
              value={valores.priceListId}
              onChange={(event) => set("priceListId", event.target.value)}
              error={errorDe("priceListId")}
              disabled={priceLists.isPending}
              hint={
                priceLists.error !== null
                  ? "No se pudieron cargar las listas."
                  : "Sin asignar, se cobra con la lista por defecto."
              }
            >
              <option value="">Sin lista asignada</option>
              {listas.map((lista) => (
                <option key={lista.id} value={lista.id}>
                  {lista.name}
                  {lista.isDefault ? " (por defecto)" : ""}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              label="Lista de precios"
              value={cliente?.priceList?.name ?? "Sin lista asignada"}
              disabled
              hint="Cambiarla requiere el permiso products.view."
            />
          )}

          {campo("creditLimit", "Límite de crédito", {
            inputMode: "decimal",
            hint: "Referencia para la cuenta corriente.",
          })}
        </div>

        <Textarea
          label="Notas"
          value={valores.notes}
          onChange={(event) => set("notes", event.target.value)}
          error={errorDe("notes")}
        />

        <div className="border-t border-stone-100 pt-6">
          <Checkbox
            label="Activo"
            hint="Los inactivos no aparecen en la búsqueda del POS."
            checked={valores.isActive}
            onChange={(event) => set("isActive", event.target.checked)}
          />
        </div>
      </Card>

      {errorServidor !== null && errorServidor !== undefined && (
        <Alert tone="danger" title="No se pudo guardar el cliente">
          {getApiErrorMessage(errorServidor)}
        </Alert>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" loading={guardando}>
          {cliente === null ? "Crear cliente" : "Guardar cambios"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={guardando}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
