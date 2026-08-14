import { useState } from "react";
import { IconLogout, IconMenu } from "@/components/icons";
import { Button } from "@/components/ui";
import { useAuth } from "@/features/auth";

/** Iniciales del nombre completo, para el avatar. */
function initials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { user, role, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-20 flex h-20 items-center justify-between gap-4 border-b border-stone-200 bg-stone-50/85 px-5 backdrop-blur-sm sm:px-8">
      <button
        type="button"
        onClick={onOpenMenu}
        className="rounded-lg p-2 text-stone-600 hover:bg-stone-100 lg:hidden"
        aria-label="Abrir menú"
      >
        <IconMenu />
      </button>

      <div className="ml-auto flex items-center gap-4">
        {user !== null && (
          <div className="flex items-center gap-3">
            <span
              className="flex size-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700"
              aria-hidden="true"
            >
              {initials(user.fullName)}
            </span>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-stone-900">{user.fullName}</p>
              <p className="text-xs text-stone-500">{role}</p>
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => void handleLogout()}
          loading={loggingOut}
          icon={<IconLogout className="size-4" />}
        >
          <span className="hidden sm:inline">Salir</span>
        </Button>
      </div>
    </header>
  );
}
