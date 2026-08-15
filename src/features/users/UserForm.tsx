import { useState, type FormEvent } from "react";
import { Alert, Button, Card, CardHeader, Checkbox, Input, Select } from "@/components/ui";
import { PERMISSIONS, useAuth } from "@/features/auth";
import { getApiErrorMessage, getApiFieldErrors } from "@/lib/api";
import { useBranchOptions, useRoles } from "./api";
import {
  createUserFormSchema,
  editUserFormSchema,
  erroresPorCampo,
  textoAApi,
  type CreateUserFormValues,
} from "./schemas";
import type { CreateUserBody, Role, UpdateUserBody, UserDetail } from "./types";

const texto = (valor: string | null | undefined) => valor ?? "";

function valoresIniciales(usuario: UserDetail | null): CreateUserFormValues {
  return {
    username: texto(usuario?.username),
    fullName: texto(usuario?.fullName),
    email: texto(usuario?.email),
    password: "",
    passwordConfirm: "",
    roleId: usuario === null ? "" : String(usuario.roleId),
    branchId: usuario?.branchId == null ? "" : String(usuario.branchId),
    isActive: usuario?.isActive ?? true,
  };
}

/**
 * Alta y edición de usuario.
 *
 * Sobre la propia cuenta el backend bloquea desactivarse y cambiarse a un
 * rol que le quite `users.manage`. Acá esas opciones directamente no se
 * ofrecen: es la misma regla, calculada con el rol y los overrides.
 */
export function UserForm({
  usuario,
  guardando,
  errorServidor,
  onSubmit,
  onCancel,
}: {
  /** `null` = alta. */
  usuario: UserDetail | null;
  guardando: boolean;
  errorServidor: unknown;
  onSubmit: (body: CreateUserBody | UpdateUserBody) => void;
  onCancel: () => void;
}) {
  const { user } = useAuth();
  const esAlta = usuario === null;
  const esPropia = usuario !== null && usuario.id === user?.id;

  const roles = useRoles();
  const branches = useBranchOptions();

  const [valores, setValores] = useState<CreateUserFormValues>(() => valoresIniciales(usuario));
  const [errores, setErrores] = useState<Record<string, string>>({});

  const erroresApi = getApiFieldErrors(errorServidor);
  const errorDe = (campo: string) => errores[campo] ?? erroresApi[campo];

  const set = <K extends keyof CreateUserFormValues>(campo: K, valor: CreateUserFormValues[K]) =>
    setValores((previos) => ({ ...previos, [campo]: valor }));

  /**
   * ¿Ese rol le seguiría dejando `users.manage` a esta cuenta? Se calcula
   * igual que el backend: permisos del rol, más los overrides concedidos,
   * menos los revocados.
   */
  const conservaGestion = (rol: Role): boolean => {
    const tendria = new Set(rol.permissions);
    for (const override of usuario?.overrides ?? []) {
      if (override.granted) tendria.add(override.permissionCode);
      else tendria.delete(override.permissionCode);
    }
    return tendria.has(PERMISSIONS.USERS_MANAGE);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const schema = esAlta ? createUserFormSchema : editUserFormSchema;
    const validado = schema.safeParse(valores);
    if (!validado.success) {
      setErrores(erroresPorCampo(validado.error));
      return;
    }
    setErrores({});

    const comunes = {
      username: valores.username.trim(),
      fullName: valores.fullName.trim(),
      email: textoAApi(valores.email),
      roleId: Number(valores.roleId),
      branchId: valores.branchId === "" ? null : Number(valores.branchId),
    };

    onSubmit(
      esAlta
        ? { ...comunes, password: valores.password, isActive: valores.isActive }
        : // La propia cuenta no manda isActive: el backend lo rechazaría
          { ...comunes, ...(esPropia ? {} : { isActive: valores.isActive }) }
    );
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      <Card className="space-y-6">
        <CardHeader title="Identificación" />

        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Nombre completo"
            required
            autoFocus
            value={valores.fullName}
            onChange={(event) => set("fullName", event.target.value)}
            error={errorDe("fullName")}
          />
          <Input
            label="Usuario"
            required
            value={valores.username}
            onChange={(event) => set("username", event.target.value)}
            error={errorDe("username")}
            hint="Con el que inicia sesión. Letras, números, punto, guión y guión bajo."
          />
          <Input
            label="Email"
            type="email"
            inputMode="email"
            value={valores.email}
            onChange={(event) => set("email", event.target.value)}
            error={errorDe("email")}
            className="sm:col-span-2"
          />
        </div>
      </Card>

      {esAlta && (
        <Card className="space-y-6">
          <CardHeader
            title="Contraseña"
            description="Mínimo 8 caracteres. Después la puede cambiar el propio usuario."
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              label="Contraseña"
              type="password"
              required
              autoComplete="new-password"
              value={valores.password}
              onChange={(event) => set("password", event.target.value)}
              error={errorDe("password")}
            />
            <Input
              label="Repetir contraseña"
              type="password"
              required
              autoComplete="new-password"
              value={valores.passwordConfirm}
              onChange={(event) => set("passwordConfirm", event.target.value)}
              error={errorDe("passwordConfirm")}
            />
          </div>
        </Card>
      )}

      <Card className="space-y-6">
        <CardHeader title="Rol y sucursal" />

        <div className="grid gap-5 sm:grid-cols-2">
          <Select
            label="Rol"
            required
            value={valores.roleId}
            onChange={(event) => set("roleId", event.target.value)}
            error={errorDe("roleId")}
            disabled={roles.isPending}
            hint={
              esPropia
                ? "No podés pasarte a un rol que te quite la gestión de usuarios."
                : "Define los permisos base; después se pueden ajustar uno por uno."
            }
          >
            <option value="">Elegí un rol…</option>
            {(roles.data ?? []).map((rol) => {
              const bloqueado = esPropia && !conservaGestion(rol);
              return (
                <option key={rol.id} value={rol.id} disabled={bloqueado}>
                  {rol.name}
                  {bloqueado ? " (te dejaría sin gestión de usuarios)" : ""}
                </option>
              );
            })}
          </Select>

          <Select
            label="Sucursal"
            value={valores.branchId}
            onChange={(event) => set("branchId", event.target.value)}
            error={errorDe("branchId")}
            hint="El backend todavía no expone el listado de sucursales: se ofrecen las que ya tienen asignadas otros usuarios."
          >
            <option value="">Sin sucursal</option>
            {(branches.data ?? []).map((sucursal) => (
              <option key={sucursal.id} value={sucursal.id}>
                {sucursal.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="border-t border-stone-100 pt-6">
          <Checkbox
            label="Activo"
            hint={
              esPropia
                ? "No podés desactivar tu propia cuenta: te quedarías afuera del sistema."
                : "Un usuario inactivo no puede iniciar sesión."
            }
            checked={esPropia ? true : valores.isActive}
            disabled={esPropia}
            onChange={(event) => set("isActive", event.target.checked)}
          />
        </div>
      </Card>

      {errorServidor !== null && errorServidor !== undefined && (
        <Alert tone="danger" title="No se pudo guardar el usuario">
          {getApiErrorMessage(errorServidor)}
        </Alert>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" loading={guardando}>
          {esAlta ? "Crear usuario" : "Guardar cambios"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={guardando}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
