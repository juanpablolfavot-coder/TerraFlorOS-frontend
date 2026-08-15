import { useState, type FormEvent } from "react";
import { Alert, Button, Input, Modal } from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api";
import { useChangePassword } from "./api";
import { erroresPorCampo, passwordFormSchema, type PasswordFormValues } from "./schemas";

const VACIO = (esPropia: boolean): PasswordFormValues => ({
  esPropia,
  currentPassword: "",
  newPassword: "",
  newPasswordConfirm: "",
});

/**
 * Cambio de contraseña.
 *
 * Sobre la propia cuenta el backend exige la contraseña actual; sobre la
 * de otro alcanza con `users.manage`. En los dos casos se caen todas las
 * sesiones abiertas del usuario afectado, así que se avisa antes.
 */
export function PasswordDialog({
  open,
  userId,
  nombre,
  esPropia,
  onClose,
  onDone,
}: {
  open: boolean;
  userId: number;
  nombre: string;
  esPropia: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const cambiar = useChangePassword(userId);
  const [valores, setValores] = useState<PasswordFormValues>(() => VACIO(esPropia));
  const [errores, setErrores] = useState<Record<string, string>>({});

  const set = <K extends keyof PasswordFormValues>(campo: K, valor: PasswordFormValues[K]) =>
    setValores((previos) => ({ ...previos, [campo]: valor }));

  const cerrar = () => {
    setValores(VACIO(esPropia));
    setErrores({});
    cambiar.reset();
    onClose();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validado = passwordFormSchema.safeParse({ ...valores, esPropia });
    if (!validado.success) {
      setErrores(erroresPorCampo(validado.error));
      return;
    }
    setErrores({});

    cambiar.mutate(
      {
        newPassword: valores.newPassword,
        // Solo viaja cuando el backend la pide: la propia cuenta
        ...(esPropia ? { currentPassword: valores.currentPassword } : {}),
      },
      {
        onSuccess: () => {
          setValores(VACIO(esPropia));
          onDone();
        },
      }
    );
  };

  return (
    <Modal
      open={open}
      onClose={cerrar}
      title={esPropia ? "Cambiar mi contraseña" : `Cambiar la contraseña de ${nombre}`}
      description="Al cambiarla se cierran todas las sesiones abiertas de esa persona."
    >
      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        {esPropia && (
          <Input
            label="Contraseña actual"
            type="password"
            required
            autoComplete="current-password"
            value={valores.currentPassword}
            onChange={(event) => set("currentPassword", event.target.value)}
            error={errores.currentPassword}
            hint="El backend la pide cuando cambiás tu propia contraseña."
          />
        )}

        <Input
          label="Contraseña nueva"
          type="password"
          required
          autoComplete="new-password"
          value={valores.newPassword}
          onChange={(event) => set("newPassword", event.target.value)}
          error={errores.newPassword}
          hint="Mínimo 8 caracteres."
        />

        <Input
          label="Repetir la nueva"
          type="password"
          required
          autoComplete="new-password"
          value={valores.newPasswordConfirm}
          onChange={(event) => set("newPasswordConfirm", event.target.value)}
          error={errores.newPasswordConfirm}
        />

        {esPropia && (
          <Alert tone="warning" className="text-sm">
            Vas a tener que volver a iniciar sesión con la contraseña nueva.
          </Alert>
        )}

        {cambiar.error !== null && (
          <Alert tone="danger" title="No se pudo cambiar la contraseña">
            {getApiErrorMessage(cambiar.error)}
          </Alert>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" loading={cambiar.isPending}>
            Cambiar contraseña
          </Button>
          <Button type="button" variant="secondary" onClick={cerrar} disabled={cambiar.isPending}>
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
