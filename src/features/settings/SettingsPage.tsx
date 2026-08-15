import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  Input,
  LoadingBlock,
  PageHeader,
} from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api";
import { useDocumentTitle } from "@/lib/hooks";
import { cn } from "@/lib/cn";
import { useSettings, useUpdateSettings } from "./api";
import { ALLOW_NEGATIVE, esVerdadero, NUMERIC_KEYS, type Setting } from "./types";

/** Nombre legible de cada grupo, deducido del prefijo de la clave. */
const GRUPO: Record<string, { titulo: string; descripcion: string }> = {
  company: { titulo: "Comercio", descripcion: "Datos del negocio." },
  pricing: { titulo: "Precios", descripcion: "Cómo se calculan y redondean." },
  stock: { titulo: "Stock", descripcion: "Qué se puede hacer cuando falta mercadería." },
  purchases: { titulo: "Compras", descripcion: "Alertas al cargar costos." },
};

/**
 * Ayuda en castellano para las claves que valen la pena explicar. La
 * `description` del backend es corta y técnica; acá se agrega el porqué.
 */
const AYUDA: Record<string, string> = {
  [ALLOW_NEGATIVE]:
    "Si está activado, podés vender productos aunque no tengan stock cargado. El stock queda en negativo y lo regularizás después. Útil mientras cargás tu inventario.",
  "pricing.rounding": "Los precios se redondean al múltiplo indicado. 0 = sin redondeo.",
  "purchases.cost_increase_alert_pct":
    "Al cargar una compra, se resalta el costo que suba más que este porcentaje respecto del último conocido.",
  "company.timezone": "Define el día contable: el panel y el arqueo usan esta zona.",
};

const esNumerica = (key: string) => (NUMERIC_KEYS as readonly string[]).includes(key);

/**
 * Interruptor de encendido/apagado.
 *
 * Vive acá y no en `components/ui/` porque es el único de la app: cuando
 * aparezca un segundo uso, se muda.
 */
function Interruptor({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean;
  onChange: (valor: boolean) => void;
  label: string;
  id: string;
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full transition-colors",
        "focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:outline-none",
        checked ? "bg-brand-600" : "bg-stone-300"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-1 size-5 rounded-full bg-white shadow-xs transition-all",
          checked ? "left-6" : "left-1"
        )}
      />
    </button>
  );
}

export function SettingsPage() {
  useDocumentTitle("Configuración");

  const settings = useSettings();
  const guardar = useUpdateSettings();

  /** Valores editados: clave → valor nuevo. */
  const [cambios, setCambios] = useState<Record<string, string>>({});
  const [confirmar, setConfirmar] = useState(false);
  const [guardado, setGuardado] = useState(false);

  const valorDe = (setting: Setting) => cambios[setting.key] ?? setting.value;

  const set = (key: string, valor: string) => {
    setGuardado(false);
    setCambios((previos) => ({ ...previos, [key]: valor }));
  };

  /** Solo las claves que realmente cambiaron viajan en el PATCH. */
  const pendientes = useMemo(() => {
    const lista = settings.data ?? [];
    return Object.entries(cambios)
      .filter(([key, valor]) => lista.find((s) => s.key === key)?.value !== valor)
      .map(([key, value]) => ({ key, value }));
  }, [cambios, settings.data]);

  /** Misma validación que el backend, para avisar antes de mandar. */
  const invalidas = useMemo(
    () =>
      pendientes
        .filter(({ key, value }) => {
          if (!esNumerica(key)) return false;
          const n = Number(value.trim());
          return !Number.isFinite(n) || n < 0;
        })
        .map(({ key }) => key),
    [pendientes]
  );

  const aplicar = () => {
    setConfirmar(false);
    guardar.mutate(pendientes, {
      onSuccess: () => {
        setCambios({});
        setGuardado(true);
      },
    });
  };

  if (settings.isPending) return <LoadingBlock label="Cargando la configuración…" />;

  if (settings.error !== null || settings.data === undefined) {
    return (
      <div className="space-y-8">
        <PageHeader title="Configuración" />
        <Alert tone="danger" title="No se pudo cargar la configuración">
          {getApiErrorMessage(settings.error)}
        </Alert>
      </div>
    );
  }

  // Agrupadas por el prefijo de la clave (company.*, stock.*, …)
  const grupos = new Map<string, Setting[]>();
  for (const setting of settings.data) {
    const grupo = setting.key.split(".")[0] ?? "otros";
    grupos.set(grupo, [...(grupos.get(grupo) ?? []), setting]);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Configuración"
        description="Cambia el comportamiento del sistema para todos los usuarios."
        actions={
          pendientes.length > 0 && (
            <Button variant="secondary" onClick={() => setCambios({})} disabled={guardar.isPending}>
              Descartar cambios
            </Button>
          )
        }
      />

      {guardado && (
        <Alert tone="success" title="Configuración guardada">
          Los cambios ya están activos para todos los usuarios.
        </Alert>
      )}

      {guardar.error !== null && (
        <Alert tone="danger" title="No se pudo guardar la configuración">
          {getApiErrorMessage(guardar.error)}
        </Alert>
      )}

      {[...grupos.entries()].map(([grupo, items]) => (
        <Card key={grupo} className="space-y-6">
          <CardHeader
            title={GRUPO[grupo]?.titulo ?? grupo}
            description={GRUPO[grupo]?.descripcion}
          />

          <div className="space-y-6">
            {items.map((setting) => {
              const valor = valorDe(setting);
              const cambiada = pendientes.some((p) => p.key === setting.key);

              if (setting.key === ALLOW_NEGATIVE) {
                const activo = esVerdadero(valor);
                return (
                  <div key={setting.key} className="flex items-start gap-4">
                    <Interruptor
                      id={setting.key}
                      checked={activo}
                      label="Permitir vender sin stock"
                      onChange={(nuevo) => set(setting.key, nuevo ? "true" : "false")}
                    />
                    <div className="space-y-1">
                      <label
                        htmlFor={setting.key}
                        className="flex flex-wrap items-center gap-2 text-sm font-medium text-stone-800"
                      >
                        Permitir vender sin stock
                        {cambiada && <span className="text-xs text-brand-700">· sin guardar</span>}
                      </label>
                      <p className="max-w-2xl text-sm text-stone-500">{AYUDA[setting.key]}</p>
                      <p className="font-mono text-xs text-stone-400">{setting.key}</p>
                    </div>
                  </div>
                );
              }

              return (
                <div key={setting.key} className="max-w-xl">
                  <Input
                    label={setting.description ?? setting.key}
                    value={valor}
                    inputMode={esNumerica(setting.key) ? "decimal" : undefined}
                    onChange={(event) => set(setting.key, event.target.value)}
                    error={
                      invalidas.includes(setting.key)
                        ? "Tiene que ser un número mayor o igual a cero"
                        : undefined
                    }
                    hint={
                      <span className="space-y-0.5">
                        {AYUDA[setting.key] !== undefined && <span className="block">{AYUDA[setting.key]}</span>}
                        <span className="block font-mono text-xs text-stone-400">
                          {setting.key}
                          {cambiada ? " · sin guardar" : ""}
                        </span>
                      </span>
                    }
                  />
                </div>
              );
            })}
          </div>
        </Card>
      ))}

      <div className="flex flex-wrap items-center gap-3 border-t border-stone-200 pt-6">
        <Button
          size="lg"
          loading={guardar.isPending}
          disabled={pendientes.length === 0 || invalidas.length > 0}
          onClick={() => setConfirmar(true)}
        >
          Guardar configuración
        </Button>
        <p className="text-sm text-stone-500">
          {pendientes.length === 0
            ? "No hay cambios sin guardar."
            : `${pendientes.length} ${pendientes.length === 1 ? "cambio" : "cambios"} sin guardar.`}
        </p>
      </div>

      <ConfirmDialog
        open={confirmar}
        title="¿Guardar la configuración?"
        description="Cambia el comportamiento del sistema para todos los usuarios, y queda registrado en la auditoría."
        confirmLabel="Guardar"
        loading={guardar.isPending}
        onCancel={() => setConfirmar(false)}
        onConfirm={aplicar}
      />
    </div>
  );
}
