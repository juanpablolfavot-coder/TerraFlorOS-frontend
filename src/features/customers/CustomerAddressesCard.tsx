import { useState, type FormEvent } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  Input,
} from "@/components/ui";
import { Can, PERMISSIONS } from "@/features/auth";
import { getApiErrorMessage } from "@/lib/api";
import { useAddAddress, useRemoveAddress } from "./api";
import { addressFormSchema, erroresPorCampo, textoAApi, type AddressFormValues } from "./schemas";
import type { CustomerAddress } from "./types";

const VACIO: AddressFormValues = {
  address: "",
  neighborhood: "",
  city: "",
  notes: "",
  isDefault: false,
};

/**
 * Direcciones del cliente.
 *
 * La invariante «una sola principal» la garantiza el backend: la primera
 * queda principal aunque no se pida, marcar una nueva desmarca la
 * anterior, y al borrar la principal se promueve otra. Acá no se replica
 * esa lógica — se muestra el resultado y se explica.
 */
export function CustomerAddressesCard({
  customerId,
  direcciones,
}: {
  customerId: number;
  direcciones: CustomerAddress[];
}) {
  const agregar = useAddAddress(customerId);
  const quitar = useRemoveAddress(customerId);

  const [valores, setValores] = useState<AddressFormValues>(VACIO);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [aBorrar, setABorrar] = useState<CustomerAddress | null>(null);

  const set = <K extends keyof AddressFormValues>(campo: K, valor: AddressFormValues[K]) =>
    setValores((previos) => ({ ...previos, [campo]: valor }));

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validado = addressFormSchema.safeParse(valores);
    if (!validado.success) {
      setErrores(erroresPorCampo(validado.error));
      return;
    }
    setErrores({});

    agregar.mutate(
      {
        address: valores.address.trim(),
        neighborhood: textoAApi(valores.neighborhood),
        city: textoAApi(valores.city),
        notes: textoAApi(valores.notes),
        isDefault: valores.isDefault,
      },
      { onSuccess: () => setValores(VACIO) }
    );
  };

  const eliminar = () => {
    if (aBorrar === null) return;
    quitar.mutate(aBorrar.id, { onSuccess: () => setABorrar(null) });
  };

  return (
    <Card className="space-y-6">
      <CardHeader
        title="Direcciones"
        description="Para entregas y reparto. Siempre hay una principal."
      />

      {direcciones.length === 0 ? (
        <EmptyState
          title="Todavía no hay direcciones"
          description="La primera que cargues queda como principal."
        />
      ) : (
        <ul className="divide-y divide-stone-100">
          {direcciones.map((direccion) => (
            <li key={direccion.id} className="flex items-start justify-between gap-4 py-4">
              <div className="space-y-1">
                <p className="flex flex-wrap items-center gap-2 text-stone-800">
                  <span className="font-medium">{direccion.address}</span>
                  {direccion.isDefault && <Badge tone="brand">Principal</Badge>}
                </p>
                <p className="text-sm text-stone-500">
                  {[direccion.neighborhood, direccion.city].filter(Boolean).join(" · ") || "—"}
                </p>
                {direccion.notes !== null && (
                  <p className="text-sm text-stone-500">{direccion.notes}</p>
                )}
              </div>

              <Can permission={PERMISSIONS.CUSTOMERS_MANAGE}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-red-600 hover:bg-red-50"
                  onClick={() => setABorrar(direccion)}
                >
                  Quitar
                </Button>
              </Can>
            </li>
          ))}
        </ul>
      )}

      {quitar.error !== null && (
        <Alert tone="danger" title="No se pudo quitar la dirección">
          {getApiErrorMessage(quitar.error)}
        </Alert>
      )}

      <Can permission={PERMISSIONS.CUSTOMERS_MANAGE}>
        <form className="space-y-5 border-t border-stone-100 pt-6" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Dirección"
              required
              placeholder="Ej: Av. Colón 1234"
              value={valores.address}
              onChange={(event) => set("address", event.target.value)}
              error={errores.address}
              className="sm:col-span-2"
            />
            <Input
              label="Barrio"
              value={valores.neighborhood}
              onChange={(event) => set("neighborhood", event.target.value)}
              error={errores.neighborhood}
            />
            <Input
              label="Localidad"
              value={valores.city}
              onChange={(event) => set("city", event.target.value)}
              error={errores.city}
            />
            <Input
              label="Referencia"
              placeholder="Ej: portón verde, tocar timbre"
              value={valores.notes}
              onChange={(event) => set("notes", event.target.value)}
              error={errores.notes}
              className="sm:col-span-2"
            />
          </div>

          <Checkbox
            label="Marcar como principal"
            hint={
              direcciones.length === 0
                ? "La primera dirección queda principal aunque no la marques."
                : "Al marcarla, la que era principal deja de serlo."
            }
            checked={valores.isDefault}
            onChange={(event) => set("isDefault", event.target.checked)}
          />

          {agregar.error !== null && (
            <Alert tone="danger" title="No se pudo agregar la dirección">
              {getApiErrorMessage(agregar.error)}
            </Alert>
          )}

          <Button type="submit" variant="secondary" loading={agregar.isPending}>
            Agregar dirección
          </Button>
        </form>
      </Can>

      <ConfirmDialog
        open={aBorrar !== null}
        title="¿Quitar la dirección?"
        description={
          aBorrar?.isDefault === true
            ? "Es la principal: al quitarla, la más antigua de las que quedan pasa a serlo."
            : "Se va a eliminar de la ficha del cliente."
        }
        confirmLabel="Quitar"
        loading={quitar.isPending}
        onCancel={() => setABorrar(null)}
        onConfirm={eliminar}
      />
    </Card>
  );
}
