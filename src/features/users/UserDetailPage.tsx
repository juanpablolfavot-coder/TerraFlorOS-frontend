import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  LoadingBlock,
  PageHeader,
} from "@/components/ui";
import { useAuth } from "@/features/auth";
import { getApiErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useDocumentTitle } from "@/lib/hooks";
import { useCreateUser, useDeleteUser, useUpdateUser, useUser } from "./api";
import { PasswordDialog } from "./PasswordDialog";
import { UserForm } from "./UserForm";
import { UserPermissionsCard } from "./UserPermissionsCard";
import type { CreateUserBody, UpdateUserBody } from "./types";

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const esAlta = id === "nuevo";
  const userId = esAlta ? null : Number(id);

  const navigate = useNavigate();
  const { user } = useAuth();

  const usuario = useUser(userId);
  const crear = useCreateUser();
  const editar = useUpdateUser(userId ?? 0);
  const borrar = useDeleteUser();

  const [editando, setEditando] = useState(false);
  const [cambiandoPassword, setCambiandoPassword] = useState(false);
  const [passwordCambiada, setPasswordCambiada] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [errorBorrado, setErrorBorrado] = useState<string | null>(null);

  useDocumentTitle(esAlta ? "Nuevo usuario" : (usuario.data?.fullName ?? "Usuario"));

  const guardar = (body: CreateUserBody | UpdateUserBody) => {
    if (esAlta) {
      crear.mutate(body as CreateUserBody, {
        onSuccess: (creado) => navigate(`/usuarios/${creado.id}`, { replace: true }),
      });
    } else {
      editar.mutate(body as UpdateUserBody, { onSuccess: () => setEditando(false) });
    }
  };

  const eliminar = () => {
    if (userId === null) return;
    setErrorBorrado(null);

    borrar.mutate(userId, {
      onSuccess: () => navigate("/usuarios", { replace: true }),
      onError: (error) => {
        setErrorBorrado(getApiErrorMessage(error));
        setConfirmarBorrado(false);
      },
    });
  };

  if (esAlta) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Nuevo usuario"
          description="El rol define los permisos base; después se pueden ajustar uno por uno."
          actions={
            <Link to="/usuarios" className="text-sm font-medium text-stone-500 hover:text-stone-800">
              Volver
            </Link>
          }
        />
        <UserForm
          usuario={null}
          guardando={crear.isPending}
          errorServidor={crear.error}
          onSubmit={guardar}
          onCancel={() => navigate("/usuarios")}
        />
      </div>
    );
  }

  if (usuario.isPending) return <LoadingBlock label="Cargando el usuario…" />;

  if (usuario.error !== null || usuario.data === undefined) {
    return (
      <div className="space-y-8">
        <PageHeader title="Usuario" />
        <Alert tone="danger" title="No se pudo cargar el usuario">
          {getApiErrorMessage(usuario.error)}
        </Alert>
      </div>
    );
  }

  const u = usuario.data;
  const esPropia = u.id === user?.id;

  if (editando) {
    return (
      <div className="space-y-8">
        <PageHeader title={`Editar ${u.fullName}`} />
        <UserForm
          usuario={u}
          guardando={editar.isPending}
          errorServidor={editar.error}
          onSubmit={guardar}
          onCancel={() => setEditando(false)}
        />
      </div>
    );
  }

  const dato = (etiqueta: string, valor: string) => (
    <div className="space-y-1">
      <dt className="text-sm text-stone-500">{etiqueta}</dt>
      <dd className="text-stone-800">{valor}</dd>
    </div>
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title={u.fullName}
        description={`@${u.username}`}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {esPropia && <Badge tone="brand">Tu cuenta</Badge>}
            {u.isActive ? <Badge tone="success">Activo</Badge> : <Badge tone="neutral">Inactivo</Badge>}
            <Button variant="secondary" onClick={() => setEditando(true)}>
              Editar
            </Button>
            <Link to="/usuarios" className="text-sm font-medium text-stone-500 hover:text-stone-800">
              Volver
            </Link>
          </div>
        }
      />

      {passwordCambiada && (
        <Alert tone="success" title="Contraseña cambiada">
          {esPropia
            ? "Vas a tener que volver a iniciar sesión con la contraseña nueva."
            : `Se cerraron todas las sesiones abiertas de ${u.fullName}.`}
        </Alert>
      )}

      {errorBorrado !== null && (
        <Alert tone="danger" title="No se pudo dar de baja">
          {errorBorrado}
        </Alert>
      )}

      <Card className="space-y-6">
        <CardHeader title="Datos del usuario" />
        <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {dato("Usuario", u.username)}
          {dato("Email", u.email ?? "—")}
          {dato("Rol", u.role.name)}
          {dato("Sucursal", u.branch?.name ?? "Sin sucursal")}
          {dato("Último ingreso", u.lastLoginAt === null ? "Nunca" : formatDateTime(u.lastLoginAt))}
          {dato("Creado", formatDateTime(u.createdAt))}
        </dl>

        <div className="flex flex-wrap items-center gap-3 border-t border-stone-100 pt-6">
          <Button variant="secondary" onClick={() => setCambiandoPassword(true)}>
            Cambiar contraseña
          </Button>
          <p className="text-sm text-stone-500">
            Cambiarla cierra todas las sesiones abiertas de esta persona.
          </p>
        </div>
      </Card>

      <UserPermissionsCard usuario={u} />

      <div className="border-t border-stone-200 pt-6">
        <Button
          variant="secondary"
          className="text-red-600 ring-red-200 hover:bg-red-50"
          disabled={esPropia}
          title={esPropia ? "No podés eliminar tu propio usuario" : undefined}
          onClick={() => setConfirmarBorrado(true)}
        >
          Dar de baja el usuario
        </Button>
        <p className="mt-2 text-sm text-stone-500">
          {esPropia
            ? "No podés darte de baja a vos mismo: te quedarías afuera del sistema."
            : "Baja lógica: pierde el acceso y se cierran sus sesiones, pero se conserva el historial."}
        </p>
      </div>

      <PasswordDialog
        open={cambiandoPassword}
        userId={u.id}
        nombre={u.fullName}
        esPropia={esPropia}
        onClose={() => setCambiandoPassword(false)}
        onDone={() => {
          setCambiandoPassword(false);
          setPasswordCambiada(true);
        }}
      />

      <ConfirmDialog
        open={confirmarBorrado}
        title={`¿Dar de baja a ${u.fullName}?`}
        description="Pierde el acceso al sistema y se cierran sus sesiones abiertas. El historial de lo que hizo se conserva."
        confirmLabel="Dar de baja"
        loading={borrar.isPending}
        onCancel={() => setConfirmarBorrado(false)}
        onConfirm={eliminar}
      />
    </div>
  );
}
