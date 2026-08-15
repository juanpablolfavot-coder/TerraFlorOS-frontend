import { useRef, useState } from "react";
import { Alert, Button } from "@/components/ui";
import {
  bytesDeDataUrl,
  formatearPeso,
  ImagenInvalida,
  MAX_ANCHO,
  prepararLogo,
} from "@/lib/image";

/**
 * Carga del logo del vivero.
 *
 * La imagen se redimensiona y comprime ACÁ, antes de guardarla: lo que
 * viaja al backend es un data URL de unas pocas decenas de KB, no la
 * foto de 3 MB que salió del celular. El valor vacío significa "sin
 * logo", y así es como se lo quita.
 */
export function LogoField({
  valor,
  cambiado,
  onChange,
}: {
  /** Data URL actual, o `""` si no hay logo. */
  valor: string;
  /** Hay un cambio sin guardar en esta clave. */
  cambiado: boolean;
  onChange: (dataUrl: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const elegir = async (file: File | undefined) => {
    if (file === undefined) return;
    setError(null);
    setAviso(null);
    setProcesando(true);

    try {
      const logo = await prepararLogo(file);
      onChange(logo.dataUrl);
      setAviso(
        `Listo: ${logo.ancho}×${logo.alto} px, ${formatearPeso(logo.bytes)}.` +
          (logo.redimensionada ? ` Se redimensionó a ${MAX_ANCHO} px de ancho como máximo.` : "")
      );
    } catch (err) {
      setError(
        err instanceof ImagenInvalida
          ? err.message
          : "No se pudo procesar la imagen. Probá con otro archivo."
      );
    } finally {
      setProcesando(false);
      // Permite volver a elegir el MISMO archivo después de un error
      if (inputRef.current !== null) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-stone-700">
        Logo
        {cambiado && <span className="ml-2 text-xs font-normal text-brand-700">· sin guardar</span>}
      </p>

      <div className="flex flex-wrap items-center gap-5">
        <div className="flex size-28 shrink-0 items-center justify-center rounded-lg bg-stone-50 p-3 ring-1 ring-stone-200 ring-inset">
          {valor === "" ? (
            <span className="text-center text-xs text-stone-400">Sin logo</span>
          ) : (
            <img
              src={valor}
              alt="Logo del vivero"
              className="max-h-full max-w-full object-contain"
            />
          )}
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              loading={procesando}
              onClick={() => inputRef.current?.click()}
            >
              {valor === "" ? "Subir logo" : "Reemplazar logo"}
            </Button>

            {valor !== "" && (
              <Button
                variant="ghost"
                className="text-red-600 hover:bg-red-50"
                onClick={() => {
                  setAviso(null);
                  setError(null);
                  onChange("");
                }}
              >
                Quitar logo
              </Button>
            )}
          </div>

          <p className="max-w-md text-sm text-stone-500">
            PNG, JPG o WEBP. Se achica solo a {MAX_ANCHO} px de ancho y se comprime antes de
            guardarlo. Sale en el encabezado de los comprobantes.
          </p>

          {valor !== "" && (
            <p className="font-mono text-xs text-stone-400">
              {formatearPeso(bytesDeDataUrl(valor))} · company.logo
            </p>
          )}
        </div>
      </div>

      {/* El input real queda oculto: el botón es más prolijo y accesible */}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        aria-label="Archivo del logo"
        className="hidden"
        onChange={(event) => void elegir(event.target.files?.[0])}
      />

      {aviso !== null && (
        <p className="text-sm text-emerald-700">
          {aviso} Acordate de guardar la configuración.
        </p>
      )}

      {error !== null && (
        <Alert tone="danger" title="No se pudo usar esa imagen">
          {error}
        </Alert>
      )}
    </div>
  );
}
