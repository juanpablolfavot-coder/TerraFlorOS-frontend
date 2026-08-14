import { Collapsible, Input, Textarea, TriStateSelect } from "@/components/ui";
import type { PlantFlags, PlantFormValues } from "./schemas";

/**
 * Ficha botánica. Son más de treinta campos, todos opcionales, así que
 * van agrupados en secciones plegables: abierta la de identificación,
 * cerradas las demás para no abrumar en el alta.
 */
export function PlantDetailFields({
  values,
  flags,
  errors,
  onChange,
  onFlagChange,
}: {
  values: PlantFormValues;
  flags: PlantFlags;
  errors: Record<string, string>;
  onChange: (campo: keyof PlantFormValues, valor: string) => void;
  onFlagChange: (campo: keyof PlantFlags, valor: boolean | null) => void;
}) {
  const campo = (
    nombre: keyof PlantFormValues,
    label: string,
    extra?: { hint?: string; inputMode?: "decimal" | "numeric" }
  ) => (
    <Input
      label={label}
      value={values[nombre]}
      onChange={(event) => onChange(nombre, event.target.value)}
      error={errors[nombre]}
      hint={extra?.hint}
      inputMode={extra?.inputMode}
    />
  );

  return (
    <div className="space-y-4">
      <Collapsible
        title="Identificación"
        description="Cómo se llama la planta, en criollo y en latín."
        defaultOpen
      >
        <div className="grid gap-5 sm:grid-cols-2">
          {campo("commonName", "Nombre común")}
          {campo("scientificName", "Nombre científico", {
            hint: "También sirve para buscarla en el catálogo.",
          })}
          {campo("genus", "Género")}
          {campo("species", "Especie")}
          {campo("variety", "Variedad")}
          {campo("cultivar", "Cultivar")}
          {campo("botanicalFamily", "Familia botánica")}
        </div>
      </Collapsible>

      <Collapsible title="Presentación" description="Cómo se vende: tamaño, maceta y edad.">
        <div className="grid gap-5 sm:grid-cols-2">
          {campo("sizeLabel", "Etiqueta de tamaño", { hint: "Ej: n°14, chica, mediana." })}
          {campo("potSizeNumber", "Número de maceta", { inputMode: "numeric" })}
          {campo("containerLiters", "Litros del contenedor", { inputMode: "decimal" })}
          {campo("heightCm", "Altura actual (cm)", { inputMode: "numeric" })}
          {campo("approxAgeMonths", "Edad aproximada (meses)", { inputMode: "numeric" })}
        </div>
      </Collapsible>

      <Collapsible title="Cultivo" description="Qué necesita para andar bien.">
        <div className="space-y-6">
          <div className="grid gap-5 sm:grid-cols-2">
            {campo("environment", "Ambiente", { hint: "Ej: exterior, interior, media sombra." })}
            {campo("lightRequirement", "Exposición solar")}
            {campo("wateringFrequency", "Riego")}
            {campo("humidity", "Humedad")}
            {campo("soilType", "Tipo de suelo")}
            {campo("phRange", "Rango de pH")}
            {campo("minTempC", "Temperatura mínima (°C)", { inputMode: "numeric" })}
            {campo("maxTempC", "Temperatura máxima (°C)", { inputMode: "numeric" })}
            {campo("growthRate", "Ritmo de crecimiento")}
            {campo("difficultyLevel", "Dificultad")}
            {campo("season", "Estación")}
            {campo("floweringSeason", "Época de floración")}
            {campo("fruitingSeason", "Época de fructificación")}
            {campo("adultHeightM", "Altura adulta (m)", { inputMode: "decimal" })}
            {campo("adultDiameterM", "Diámetro adulto (m)", { inputMode: "decimal" })}
          </div>

          <div className="grid gap-5 border-t border-stone-100 pt-6 sm:grid-cols-2 lg:grid-cols-3">
            <TriStateSelect
              label="Tolera heladas"
              value={flags.frostTolerant}
              onChange={(valor) => onFlagChange("frostTolerant", valor)}
            />
            <TriStateSelect
              label="Resiste el calor"
              value={flags.heatResistant}
              onChange={(valor) => onFlagChange("heatResistant", valor)}
            />
            <TriStateSelect
              label="Es tóxica"
              value={flags.isToxic}
              onChange={(valor) => onFlagChange("isToxic", valor)}
            />
            <TriStateSelect
              label="Apta para mascotas"
              value={flags.petFriendly}
              onChange={(valor) => onFlagChange("petFriendly", valor)}
            />
            <TriStateSelect
              label="Apta para interior"
              value={flags.indoorSuitable}
              onChange={(valor) => onFlagChange("indoorSuitable", valor)}
            />
          </div>
        </div>
      </Collapsible>

      <Collapsible title="Notas de cuidado">
        <Textarea
          label="Notas"
          rows={5}
          value={values.careNotes}
          onChange={(event) => onChange("careNotes", event.target.value)}
          error={errors.careNotes}
          hint="Lo que conviene saber al venderla o cuidarla."
        />
      </Collapsible>
    </div>
  );
}
