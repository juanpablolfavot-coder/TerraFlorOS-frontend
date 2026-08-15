import type { SVGProps } from "react";

/**
 * Iconos propios, trazo simple 24×24. Sin librería: son pocos y así no
 * arrastramos un paquete entero para diez formas.
 */
type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-5 shrink-0"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconDashboard = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </Icon>
);

export const IconSales = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.5L21 8H6" />
    <circle cx="10" cy="20" r="1.2" />
    <circle cx="18" cy="20" r="1.2" />
  </Icon>
);

export const IconLeaf = (props: IconProps) => (
  <Icon {...props}>
    <path d="M5 20c0-8 5-13 15-14 0 10-5 14-11 14H5Z" />
    <path d="M9 16c1.5-3.5 3.8-6 7-7.5" />
  </Icon>
);

export const IconBoxes = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" />
    <path d="m4 7 8 4 8-4M12 11v10" />
  </Icon>
);

export const IconTruck = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 6h11v10H3zM14 9h4l3 3v4h-7z" />
    <circle cx="7" cy="18" r="1.6" />
    <circle cx="17" cy="18" r="1.6" />
  </Icon>
);

export const IconUsers = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
    <path d="M16 11.2A3.2 3.2 0 0 0 16 5M18 19.5c0-2-.6-3.6-1.8-4.7" />
  </Icon>
);

/** Historial de cajas: un reloj con su flecha de vuelta atrás. */
export const IconHistory = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
    <path d="M3 4v4.5h4.5" />
    <path d="M12 7.5V12l3 1.8" />
  </Icon>
);

/** Configuración: el engranaje de siempre. */
export const IconSettings = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9 5.3 5.3" />
  </Icon>
);

/** Presupuestos: una hoja con renglones y su total. */
export const IconQuote = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6 3h8l4 4v14H6z" />
    <path d="M14 3v4h4" />
    <path d="M9 12h6M9 16h4" />
  </Icon>
);

/** Consulta de precios: etiqueta colgante con su agujero. */
export const IconTag = (props: IconProps) => (
  <Icon {...props}>
    <path d="M11 3H4a1 1 0 0 0-1 1v7l9.5 9.5a1.5 1.5 0 0 0 2.1 0l6-6a1.5 1.5 0 0 0 0-2.1L11 3Z" />
    <circle cx="7.5" cy="7.5" r="1.2" />
  </Icon>
);

/** Clientes: una sola persona en su ficha, distinta de IconUsers. */
export const IconContact = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="4" width="18" height="16" rx="2.5" />
    <circle cx="9.5" cy="10.5" r="2.2" />
    <path d="M6 17c0-1.9 1.6-3 3.5-3s3.5 1.1 3.5 3" />
    <path d="M15.5 9.5h3M15.5 13h3" />
  </Icon>
);

export const IconCash = (props: IconProps) => (
  <Icon {...props}>
    <rect x="2.5" y="6" width="19" height="12" rx="2" />
    <circle cx="12" cy="12" r="2.6" />
    <path d="M6 12h.01M18 12h.01" />
  </Icon>
);

export const IconBuilding = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 21V6l7-3v18M11 21h9V10h-9" />
    <path d="M14.5 13.5h2M14.5 17h2M7 8.5h1M7 12h1M7 15.5h1" />
  </Icon>
);

export const IconLogout = (props: IconProps) => (
  <Icon {...props}>
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
    <path d="M10 16 6 12l4-4M6 12h10" />
  </Icon>
);

export const IconMenu = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Icon>
);

export const IconClose = (props: IconProps) => (
  <Icon {...props}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Icon>
);
