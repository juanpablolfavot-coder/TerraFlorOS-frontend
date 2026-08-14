import { useState } from "react";
import { Alert, Badge, Button, Input, Spinner } from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api";
import { useDebouncedValue } from "@/lib/hooks";
import { useCustomerSearch } from "./api";
import { SEGMENT_LABEL, type CustomerListItem } from "./types";

/**
 * Elección de cliente para el POS. La venta puede ir SIN cliente: es un
 * dato opcional, no un paso obligatorio del cobro.
 */
export function CustomerPicker({
  cliente,
  onChange,
  listaAsignada,
}: {
  cliente: CustomerListItem | null;
  onChange: (cliente: CustomerListItem | null) => void;
  /** Nombre de la lista de precios del cliente, si tiene una activa. */
  listaAsignada?: string | null;
}) {
  const [term, setTerm] = useState("");
  const debounced = useDebouncedValue(term, 300);
  const busqueda = useCustomerSearch(debounced);

  if (cliente !== null) {
    return (
      <div className="flex items-start justify-between gap-4 rounded-lg bg-stone-50 px-4 py-3">
        <div className="space-y-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-stone-900">{cliente.name}</span>
            <Badge tone="brand">{SEGMENT_LABEL[cliente.segment] ?? cliente.segment}</Badge>
          </p>
          <p className="text-sm text-stone-500">
            {cliente.phone ?? cliente.whatsapp ?? cliente.email ?? "Sin datos de contacto"}
          </p>
          {listaAsignada != null && (
            <p className="text-sm text-stone-500">Se cobra con la lista {listaAsignada}.</p>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="shrink-0"
          // El carrito también tiene botones "Quitar": el nombre accesible
          // aclara cuál es cuál para quien navega por lector de pantalla.
          aria-label={`Quitar a ${cliente.name} de la venta`}
          onClick={() => {
            onChange(null);
            setTerm("");
          }}
        >
          Quitar
        </Button>
      </div>
    );
  }

  const resultados = busqueda.data ?? [];
  const mostrarResultados = debounced.trim().length >= 2;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Input
          aria-label="Buscar cliente"
          placeholder="Buscá por nombre, teléfono, email o CUIT…"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
        />
        {busqueda.isFetching && (
          <span className="absolute top-1/2 right-3.5 -translate-y-1/2 text-stone-400">
            <Spinner size="sm" />
          </span>
        )}
      </div>

      {busqueda.error !== null && (
        <Alert tone="warning" className="text-sm">
          {getApiErrorMessage(busqueda.error, "No se pudo buscar clientes")}
        </Alert>
      )}

      {mostrarResultados && busqueda.error === null && (
        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
          {busqueda.isPending ? (
            <p className="px-4 py-4 text-center text-sm text-stone-500">Buscando…</p>
          ) : resultados.length === 0 ? (
            <p className="px-4 py-4 text-center text-sm text-stone-500">
              Ningún cliente coincide con «{debounced.trim()}».
            </p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {resultados.map((encontrado) => (
                <li key={encontrado.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(encontrado);
                      setTerm("");
                    }}
                    className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-stone-50"
                  >
                    <span>
                      <span className="block text-sm font-medium text-stone-900">
                        {encontrado.name}
                      </span>
                      <span className="text-xs text-stone-500">
                        {encontrado.phone ?? encontrado.taxId ?? encontrado.email ?? "—"}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-stone-400">
                      {SEGMENT_LABEL[encontrado.segment] ?? encontrado.segment}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
