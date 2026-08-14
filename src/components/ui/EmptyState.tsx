import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
      <p className="text-base font-medium text-stone-900">{title}</p>
      {description !== undefined && (
        <p className="max-w-md text-sm text-stone-500">{description}</p>
      )}
      {action !== undefined && <div className="mt-3">{action}</div>}
    </div>
  );
}
