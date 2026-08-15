import { z } from "zod";

/**
 * Espejo de `users.schemas.ts` del backend: mismo largo mínimo de
 * contraseña, mismo formato de usuario.
 */

const username = z
  .string()
  .trim()
  .min(3, "El usuario debe tener al menos 3 caracteres")
  .max(50, "Máximo 50 caracteres")
  .regex(/^[a-zA-Z0-9._-]+$/, "Solo letras, números, punto, guión y guión bajo");

const password = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(200, "Máximo 200 caracteres");

const email = z
  .string()
  .trim()
  .max(150, "Máximo 150 caracteres")
  .refine((valor) => valor === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(valor), {
    message: "Email inválido",
  });

/** Alta: pide contraseña con confirmación. */
export const createUserFormSchema = z
  .object({
    username,
    fullName: z.string().trim().min(1, "El nombre es obligatorio").max(150, "Máximo 150 caracteres"),
    email,
    password,
    passwordConfirm: z.string(),
    roleId: z.string().min(1, "Elegí un rol"),
    branchId: z.string(),
    isActive: z.boolean(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Las contraseñas no coinciden",
    path: ["passwordConfirm"],
  });

export type CreateUserFormValues = z.infer<typeof createUserFormSchema>;

/** Edición: sin contraseña, que va por su propio formulario. */
export const editUserFormSchema = z.object({
  username,
  fullName: z.string().trim().min(1, "El nombre es obligatorio").max(150, "Máximo 150 caracteres"),
  email,
  roleId: z.string().min(1, "Elegí un rol"),
  branchId: z.string(),
  isActive: z.boolean(),
});

export type EditUserFormValues = z.infer<typeof editUserFormSchema>;

/** Cambio de contraseña. `currentPassword` solo para la propia cuenta. */
export const passwordFormSchema = z
  .object({
    esPropia: z.boolean(),
    currentPassword: z.string(),
    newPassword: password,
    newPasswordConfirm: z.string(),
  })
  .refine((data) => !data.esPropia || data.currentPassword.length > 0, {
    message: "Ingresá tu contraseña actual",
    path: ["currentPassword"],
  })
  .refine((data) => data.newPassword === data.newPasswordConfirm, {
    message: "Las contraseñas no coinciden",
    path: ["newPasswordConfirm"],
  });

export type PasswordFormValues = z.infer<typeof passwordFormSchema>;

export { erroresPorCampo, textoAApi } from "@/lib/forms";
