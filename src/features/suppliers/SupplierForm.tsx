import { useState, type FormEvent } from "react";
import { Alert, Button, Card, CardHeader, Checkbox, Input, Textarea } from "@/components/ui";
import { getApiErrorMessage, getApiFieldErrors } from "@/lib/api";
import { toNumber } from "@/lib/format";
import {
  erroresPorCampo,
  numeroAApi,
  supplierFormSchema,
  textoAApi,
  type SupplierFormValues,
} from "./schemas";
import type { CreateSupplierBody, Supplier } from "./types";

const texto = (valor: string | null | undefined) => valor ?? "";

function valoresIniciales(proveedor: Supplier | null): SupplierFormValues {
  return {
    legalName: texto(proveedor?.legalName),
    tradeName: texto(proveedor?.tradeName),
    taxId: texto(proveedor?.taxId),
    contactName: texto(proveedor?.contactName),
    phone: texto(proveedor?.phone),
    whatsapp: texto(proveedor?.whatsapp),
    email: texto(proveedor?.email),
    address: texto(proveedor?.address),
    deliveryDays: texto(proveedor?.deliveryDays),
    minOrderAmount:
      proveedor?.minOrderAmount == null ? "" : String(toNumber(proveedor.minOrderAmount)),
    paymentTerms: texto(proveedor?.paymentTerms),
    notes: texto(proveedor?.notes),
    isActive: proveedor?.isActive ?? true,
  };
}

export function SupplierForm({
  proveedor,
  guardando,
  errorServidor,
  onSubmit,
  onCancel,
}: {
  /** `null` = alta. */
  proveedor: Supplier | null;
  guardando: boolean;
  errorServidor: unknown;
  onSubmit: (body: CreateSupplierBody) => void;
  onCancel: () => void;
}) {
  const [valores, setValores] = useState<SupplierFormValues>(() => valoresIniciales(proveedor));
  const [errores, setErrores] = useState<Record<string, string>>({});

  const erroresApi = getApiFieldErrors(errorServidor);
  const errorDe = (campo: string) => errores[campo] ?? erroresApi[campo];

  const set = <K extends keyof SupplierFormValues>(campo: K, valor: SupplierFormValues[K]) =>
    setValores((previos) => ({ ...previos, [campo]: valor }));

  const campo = (
    nombre: keyof SupplierFormValues & string,
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

    const validado = supplierFormSchema.safeParse(valores);
    if (!validado.success) {
      setErrores(erroresPorCampo(validado.error));
      return;
    }
    setErrores({});

    onSubmit({
      legalName: valores.legalName.trim(),
      tradeName: textoAApi(valores.tradeName),
      taxId: textoAApi(valores.taxId),
      contactName: textoAApi(valores.contactName),
      phone: textoAApi(valores.phone),
      whatsapp: textoAApi(valores.whatsapp),
      email: textoAApi(valores.email),
      address: textoAApi(valores.address),
      deliveryDays: textoAApi(valores.deliveryDays),
      minOrderAmount: numeroAApi(valores.minOrderAmount),
      paymentTerms: textoAApi(valores.paymentTerms),
      notes: textoAApi(valores.notes),
      isActive: valores.isActive,
    });
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      <Card className="space-y-6">
        <CardHeader title="Identificación" />

        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Razón social"
            required
            autoFocus
            value={valores.legalName}
            onChange={(event) => set("legalName", event.target.value)}
            error={errorDe("legalName")}
            className="sm:col-span-2"
          />
          {campo("tradeName", "Nombre comercial", { hint: "Con el que se lo conoce." })}
          {campo("taxId", "CUIT")}
        </div>
      </Card>

      <Card className="space-y-6">
        <CardHeader title="Contacto" />

        <div className="grid gap-5 sm:grid-cols-2">
          {campo("contactName", "Persona de contacto")}
          {campo("email", "Email", { type: "email", inputMode: "email" })}
          {campo("phone", "Teléfono", { inputMode: "tel" })}
          {campo("whatsapp", "WhatsApp", { inputMode: "tel" })}
          {campo("address", "Dirección")}
        </div>
      </Card>

      <Card className="space-y-6">
        <CardHeader title="Condiciones comerciales" />

        <div className="grid gap-5 sm:grid-cols-2">
          {campo("deliveryDays", "Días de entrega", { hint: "Ej: martes y viernes." })}
          {campo("minOrderAmount", "Mínimo de compra", { inputMode: "decimal" })}
          {campo("paymentTerms", "Condiciones de pago", { hint: "Ej: 30 días fecha factura." })}
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
            hint="Los inactivos no aparecen para elegir en una compra."
            checked={valores.isActive}
            onChange={(event) => set("isActive", event.target.checked)}
          />
        </div>
      </Card>

      {errorServidor !== null && errorServidor !== undefined && (
        <Alert tone="danger" title="No se pudo guardar el proveedor">
          {getApiErrorMessage(errorServidor)}
        </Alert>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" loading={guardando}>
          {proveedor === null ? "Crear proveedor" : "Guardar cambios"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={guardando}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
