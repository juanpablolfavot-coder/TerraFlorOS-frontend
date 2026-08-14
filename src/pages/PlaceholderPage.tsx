import { Card, PageHeader } from "@/components/ui";

/**
 * Pantalla provisoria para los módulos que todavía no están hechos.
 * La ruta y el permiso ya funcionan: solo falta la interfaz.
 */
export function PlaceholderPage({
  title,
  description,
  next,
}: {
  title: string;
  description: string;
  next: string[];
}) {
  return (
    <div className="space-y-8">
      <PageHeader title={title} description={description} />

      <Card className="space-y-5">
        <p className="text-sm font-medium text-stone-900">Pendiente de implementación</p>
        <ul className="space-y-2.5 text-sm text-stone-600">
          {next.map((item) => (
            <li key={item} className="flex gap-3">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-stone-300" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
