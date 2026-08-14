import { z } from "zod";
import { CUSTOMER_SEGMENTS } from "./types";

/**
 * Espejo de `createCustomerSchema` del backend, con los mismos largos
 * máximos. Los campos viven como string en el formulario y se convierten
 * al enviar (vacío → `null`).
 */
const opcional = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres`);

export const customerFormSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(200, "Máximo 200 caracteres"),
  phone: opcional(30),
  whatsapp: opcional(30),
  email: opcional(150).refine(
    (valor) => valor === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(valor),
    { message: "Email inválido" }
  ),
  taxId: opcional(20),
  segment: z.enum(CUSTOMER_SEGMENTS),
  /** "" = sin lista asignada; el select guarda el id como string. */
  priceListId: z.string(),
  creditLimit: z.string().trim().refine(
    (valor) => {
      if (valor === "") return true;
      const n = Number(valor.replace(",", "."));
      return Number.isFinite(n) && n >= 0;
    },
    { message: "Ingresá un monto válido" }
  ),
  notes: opcional(2000),
  isActive: z.boolean(),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;

/** Espejo de `createAddressSchema`. */
export const addressFormSchema = z.object({
  address: z.string().trim().min(1, "La dirección es obligatoria").max(300, "Máximo 300 caracteres"),
  neighborhood: opcional(200),
  city: opcional(200),
  notes: opcional(500),
  isDefault: z.boolean(),
});

export type AddressFormValues = z.infer<typeof addressFormSchema>;

export { erroresPorCampo, numeroAApi, textoAApi } from "@/lib/forms";
