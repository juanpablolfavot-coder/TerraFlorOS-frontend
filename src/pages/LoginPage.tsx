import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { IconLeaf } from "@/components/icons";
import { Alert, Button, Card, Input } from "@/components/ui";
import { AuthSplash, useAuth } from "@/features/auth";
import { getApiErrorMessage } from "@/lib/api";

interface LocationState {
  from?: { pathname: string };
}

export function LoginPage() {
  const { status, isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // A dónde volver después de entrar (lo dejó RequireAuth).
  const from = (location.state as LocationState | null)?.from?.pathname ?? "/";

  useEffect(() => {
    document.title = "Ingresar · TerraFlorOS";
  }, []);

  if (status === "loading") return <AuthSplash />;
  if (isAuthenticated) return <Navigate to={from} replace />;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login({ username: username.trim(), password });
      navigate(from, { replace: true });
    } catch (loginError) {
      setError(getApiErrorMessage(loginError, "No se pudo iniciar sesión"));
      setPassword("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-stone-50 px-5 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <IconLeaf className="size-7" />
          </span>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">
              {import.meta.env.VITE_APP_NAME ?? "TerraFlorOS"}
            </h1>
            <p className="text-sm text-stone-500">Gestión de vivero</p>
          </div>
        </div>

        <Card>
          <form className="space-y-6" onSubmit={(event) => void handleSubmit(event)} noValidate>
            {error !== null && <Alert tone="danger">{error}</Alert>}

            <Input
              label="Usuario"
              name="username"
              autoComplete="username"
              autoFocus
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />

            <Input
              label="Contraseña"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />

            <Button
              type="submit"
              size="lg"
              fullWidth
              loading={submitting}
              disabled={username.trim() === "" || password === ""}
            >
              Ingresar
            </Button>
          </form>
        </Card>

        <p className="text-center text-xs text-stone-400">
          Si no podés entrar, pedile al administrador que revise tu usuario.
        </p>
      </div>
    </div>
  );
}
