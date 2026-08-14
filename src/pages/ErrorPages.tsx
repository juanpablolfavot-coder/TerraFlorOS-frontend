import { Link } from "react-router-dom";
import { Button } from "@/components/ui";

function CenteredMessage({
  code,
  title,
  description,
}: {
  code: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-6 text-center">
      <p className="text-sm font-semibold tracking-widest text-brand-600 uppercase">{code}</p>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      <p className="max-w-md text-sm text-stone-500">{description}</p>
      <Button className="mt-2" onClick={() => window.history.back()}>
        Volver
      </Button>
      <Link to="/" className="text-sm text-stone-500 underline underline-offset-4 hover:text-stone-800">
        Ir al inicio
      </Link>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <CenteredMessage
      code="404"
      title="No encontramos esa página"
      description="El enlace puede estar viejo o la dirección mal escrita."
    />
  );
}

export function ForbiddenPage() {
  return (
    <CenteredMessage
      code="403"
      title="No tenés permiso para esta sección"
      description="Tu usuario no tiene habilitado este módulo. Si lo necesitás, pedíselo al administrador."
    />
  );
}
