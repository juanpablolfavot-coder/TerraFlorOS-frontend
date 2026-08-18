import { z } from "zod";

/**
 * Validación del formulario de producto, espejo de products.schemas.ts
 * del backend. Sirve para avisar antes de mandar; la validación que
 * manda sigue siendo la del servidor.
 *
 * Los campos numéricos y de texto se manejan como STRING en el
 * formulario (así se puede dejar vacío sin pelear con `NaN`) y recién
 * al enviar se convierten al tipo que espera la API.
 */

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .optional()
    .or(z.literal(""));

/** Número opcional escrito a mano: acepta coma decimal y vacío. */
const numeroOpcional = (opciones?: { min?: number; max?: number; entero?: boolean }) =>
  z
    .string()
    .trim()
    .refine(
      (valor) => {
        if (valor === "") return true;
        const n = Number(valor.replace(",", "."));
        if (!Number.isFinite(n)) return false;
        if (opciones?.entero === true && !Number.isInteger(n)) return false;
        if (opciones?.min !== undefined && n < opciones.min) return false;
        if (opciones?.max !== undefined && n > opciones.max) return false;
        return true;
      },
      { message: "Número inválido" }
    );

export const productFormSchema = z.object({
  kind: z.enum(["CONVENTIONAL", "PLANT"]),
  sku: z.string().trim().min(1, "El SKU es obligatorio").max(50, "Máximo 50 caracteres"),
  name: z.string().trim().min(1, "El nombre es obligatorio").max(200, "Máximo 200 caracteres"),
  internalCode: textoOpcional(50),
  description: textoOpcional(2000),
  categoryId: z.string(),
  unit: z.string().trim().min(1, "La unidad es obligatoria").max(30),
  unitsPerTray: numeroOpcional({ min: 0.01 }),
  minStock: numeroOpcional({ min: 0 }),
  optimalStock: numeroOpcional({ min: 0 }),
  maxStock: numeroOpcional({ min: 0 }),
  mainSupplierId: z.string(),
  // Solo se usa en el ALTA y con products.edit_cost; ver CostoPrecioCard
  initialCost: numeroOpcional({ min: 0 }),
  imageUrl: z
    .string()
    .trim()
    .max(500)
    .refine((valor) => valor === "" || /^https?:\/\/\S+$/.test(valor), { message: "URL inválida" }),
  isActive: z.boolean(),
  isFavorite: z.boolean(),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

/**
 * Ficha de planta. Todo opcional; los rangos replican los del backend
 * (temperaturas entre -50 y 60, textos de 200 y notas de 2000).
 */
export const plantFormSchema = z.object({
  commonName: textoOpcional(200),
  scientificName: textoOpcional(200),
  genus: textoOpcional(200),
  species: textoOpcional(200),
  variety: textoOpcional(200),
  cultivar: textoOpcional(200),
  botanicalFamily: textoOpcional(200),

  sizeLabel: textoOpcional(200),
  heightCm: numeroOpcional({ entero: true, min: 0 }),
  potSizeNumber: numeroOpcional({ entero: true, min: 0 }),
  containerLiters: numeroOpcional({ min: 0 }),
  approxAgeMonths: numeroOpcional({ entero: true, min: 0 }),

  environment: textoOpcional(200),
  lightRequirement: textoOpcional(200),
  wateringFrequency: textoOpcional(200),
  humidity: textoOpcional(200),
  minTempC: numeroOpcional({ entero: true, min: -50, max: 60 }),
  maxTempC: numeroOpcional({ entero: true, min: -50, max: 60 }),
  season: textoOpcional(200),
  floweringSeason: textoOpcional(200),
  fruitingSeason: textoOpcional(200),
  growthRate: textoOpcional(200),
  adultHeightM: numeroOpcional({ min: 0 }),
  adultDiameterM: numeroOpcional({ min: 0 }),
  soilType: textoOpcional(200),
  phRange: textoOpcional(200),
  difficultyLevel: textoOpcional(200),
  careNotes: textoOpcional(2000),
});

export type PlantFormValues = z.infer<typeof plantFormSchema>;

/** Booleanos de la ficha: viven aparte porque son de tres estados. */
export interface PlantFlags {
  frostTolerant: boolean | null;
  heatResistant: boolean | null;
  isToxic: boolean | null;
  petFriendly: boolean | null;
  indoorSuitable: boolean | null;
}

export const barcodeSchema = z
  .string()
  .trim()
  .min(3, "Código demasiado corto")
  .max(64, "Máximo 64 caracteres");

/** Conversores y errores por campo, comunes a todos los formularios. */
export { erroresPorCampo, numeroAApi, textoAApi } from "@/lib/forms";
