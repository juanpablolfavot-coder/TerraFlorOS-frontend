import { z } from "zod";

/**
 * Espejo de `createSupplierSchema` del backend, con los mismos largos
 * máximos. Los campos viven como string en el formulario y se convierten
 * al enviar (vacío → `null`).
 */
const opcional = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres`);

export const supplierFormSchema = z.object({
  legalName: z
    .string()
    .trim()
    .min(1, "La razón social es obligatoria")
    .max(200, "Máximo 200 caracteres"),
  tradeName: opcional(200),
  taxId: opcional(20),
  contactName: opcional(200),
  phone: opcional(30),
  whatsapp: opcional(30),
  email: opcional(150).refine(
    (valor) => valor === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(valor),
    { message: "Email inválido" }
  ),
  address: opcional(200),
  deliveryDays: opcional(200),
  minOrderAmount: z.string().trim().refine(
    (valor) => {
      if (valor === "") return true;
      const n = Number(valor.replace(",", "."));
      return Number.isFinite(n) && n >= 0;
    },
    { message: "Ingresá un monto válido" }
  ),
  paymentTerms: opcional(200),
  notes: opcional(2000),
  isActive: z.boolean(),
});

export type SupplierFormValues = z.infer<typeof supplierFormSchema>;

export const supplierProductSchema = z.object({
  supplierCode: opcional(50),
  supplierName: opcional(200),
  presentation: opcional(100),
  conversionFactor: z.string().trim().refine(
    (valor) => {
      if (valor === "") return true;
      const n = Number(valor.replace(",", "."));
      return Number.isFinite(n) && n > 0;
    },
    { message: "Tiene que ser mayor a cero" }
  ),
});

/** Conversores y errores por campo, comunes a todos los formularios. */
export { erroresPorCampo, numeroAApi, textoAApi } from "@/lib/forms";
