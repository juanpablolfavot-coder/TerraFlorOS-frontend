# TerraFlorOS — Frontend

Interfaz web del ERP de vivero **TerraFlorOS**. Consume la API REST del
backend (`TerraFlorOS-backend`, rutas bajo `/api`).

Criterio de diseño: **limpio y espacioso**. Mucho aire, tipografía grande,
poco color. La operación diaria manda; los efectos visuales no.

---

## Stack

| Pieza          | Elección                                        |
| -------------- | ----------------------------------------------- |
| Framework      | React 19 + TypeScript                           |
| Build          | Vite                                            |
| Ruteo          | React Router v6                                 |
| Datos          | TanStack Query v5                               |
| HTTP           | Axios                                           |
| Estilos        | Tailwind CSS v4 (configuración en CSS, sin JS)  |
| Componentes    | Propios, en `src/components/ui/`                |

No hay librería de componentes: los controles que se usan son pocos y
mantenerlos propios evita pelear con estilos ajenos.

---

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # ajustar VITE_API_URL
npm run dev                  # http://localhost:5173
```

El backend tiene que estar corriendo y con `CORS_ORIGIN` incluyendo
`http://localhost:5173` (es su valor por defecto).

### Variables de entorno

| Variable        | Descripción                                                    |
| --------------- | -------------------------------------------------------------- |
| `VITE_API_URL`  | Origen del backend, **sin** el sufijo `/api`. Ej: `http://localhost:3000` |
| `VITE_APP_NAME` | Nombre visible del negocio (opcional, por defecto `TerraFlorOS`) |

### Scripts

| Comando             | Qué hace                              |
| ------------------- | ------------------------------------- |
| `npm run dev`       | Servidor de desarrollo con HMR        |
| `npm run build`     | Chequeo de tipos + build de producción |
| `npm run preview`   | Sirve el build de producción          |
| `npm run typecheck` | Solo chequeo de tipos                 |

---

## Estructura

```
src/
  app/
    navigation.ts        Módulos del menú y su permiso
    routes.tsx           Árbol de rutas con sus guards
  components/
    icons.tsx            Iconos propios (SVG)
    layout/              AppLayout, Sidebar, Topbar
    ui/                  Button, Input, Card, Table, Spinner, …
  features/
    auth/                Contexto de sesión, permisos y guards
    cash/                Caja: apertura, movimientos y cierre
    categories/          Árbol de categorías
    dashboard/           Panel del día
    products/            Catálogo: lista, ficha, precios y códigos
    sales/               POS: buscador, carrito y cobro
  lib/
    api.ts               Instancia de Axios + refresh de sesión
    session.ts           Access token en memoria
    format.ts            Dinero, cantidades y fechas en es-AR
    queryClient.ts       Configuración de TanStack Query
    hooks.ts             useDebouncedValue, useDocumentTitle
  pages/                 Login, 404, 403, placeholders
```

---

## Autenticación

El esquema sigue lo que expone el backend:

- **Access token en memoria.** Nunca en `localStorage` ni `sessionStorage`:
  si hay un XSS, no encuentra un token guardado para robar. Se pierde al
  recargar, y está bien.
- **Refresh token en cookie httpOnly**, que pone el backend con
  `path=/api/auth`. El JavaScript no puede leerla. Por eso todas las
  requests van con `withCredentials: true`.
- **Al arrancar la app** se intenta `POST /api/auth/refresh`. Si responde,
  se pide `GET /api/auth/me` y la sesión queda restaurada; si no, se cae a
  la pantalla de login. Mientras tanto se muestra una pantalla de carga:
  sin ese estado intermedio la app parpadearía a `/login` en cada recarga.
- **Ante un 401** el interceptor intenta refrescar **una sola vez** y
  reintenta la request original con el token nuevo. Si el refresh también
  falla, limpia la sesión y manda a `/login`.

Dos detalles que evitan problemas reales:

1. **Un solo refresh en vuelo.** Si cinco requests fallan con 401 a la vez,
   todas esperan el mismo refresh. El backend rota el refresh token y trata
   el reuso como robo: varios refresh concurrentes con la misma cookie le
   revocarían **todas** las sesiones al usuario.
2. **La request reintentada se marca.** Si el reintento vuelve a dar 401, el
   error sube tal cual en vez de entrar en un bucle de refresh.

### Permisos

`GET /api/auth/me` devuelve los permisos **efectivos** (los del rol, más o
menos los overrides individuales). Con eso:

```tsx
const { can } = useAuth();
can(PERMISSIONS.PRODUCTS_VIEW_COST);       // boolean

<Can permission={PERMISSIONS.PRODUCTS_MANAGE}>
  <Button>Nuevo producto</Button>
</Can>
```

En rutas:

```tsx
<Route element={<RequirePermission permission={PERMISSIONS.REPORTS_VIEW} />}>
  <Route path="panel" element={<DashboardPage />} />
</Route>
```

> Esto es **solo interfaz**: decide qué se muestra y qué se oculta. La
> autorización de verdad la aplica el backend en cada endpoint. Esconder un
> botón no protege nada.

El menú lateral se filtra igual, y la raíz `/` redirige al primer módulo
que el usuario pueda ver: un cajero sin `reports.view` entra directo a
Ventas en vez de chocar contra un panel vacío.

---

## Notas sobre los datos

- **Los `Decimal` de Prisma llegan como string** en el JSON (precios,
  costos, stock). Usar `toNumber()` / `formatMoney()` de `lib/format.ts`;
  nunca hacer aritmética directa sobre esos campos.
- **Los campos de costo pueden no venir.** `lastCost`, `averageCost`,
  `cmv`, `margin` e `inventoryValueAtCost` solo viajan si el usuario tiene
  `products.view_cost`. Por eso son opcionales en los tipos y la interfaz
  tiene que funcionar sin ellos.
- **Errores del backend** con la forma `{ error: { code, message, details } }`.
  Para mostrarlos: `getApiErrorMessage(error)`; para errores de validación
  por campo: `getApiFieldErrors(error)`.

---

## Estado actual

Implementado:

- Login, cierre de sesión y restauración de sesión al recargar
- Layout, menú filtrado por permisos, 403 y 404
- **Panel**: ventas del día, medios de pago, plantas e inventario
- **Productos**: listado con búsqueda, filtros por tipo/categoría/estado y
  paginación
- **Ventas (POS)**: buscador que escanea y busca, carrito, pago mixto y cobro
- **Caja**: apertura, resumen del turno en vivo, movimientos manuales
  (gasto, retiro, depósito) y cierre con arqueo
- **Catálogo**: lista con filtros, alta y edición de productos con ficha
  botánica, precios por lista con historial, códigos de barras y árbol de
  categorías

Pendiente (las rutas y los permisos ya existen, falta la interfaz):
Inventario, Compras, Proveedores y Usuarios.

---

## Contrato con el backend

Detalles del contrato que conviene tener presentes:

- **Naming de caja:** todos los endpoints usan `registerId`, incluido
  `POST /api/cash/sessions`. Su schema es `.strict()`, así que un nombre
  distinto devuelve 400
- **Lecturas de caja** (`GET /api/cash/registers` y `/sessions/current`)
  aceptan `sales.create` **o** `cash.open`: un vendedor puede consultar si
  hay caja abierta y facturar. Abrirla sigue exigiendo `cash.open`
- **`GET /api/price-lists`** devuelve las listas activas con la default
  primera. El POS toma esa como precio base y, si hay más de una, deja
  elegir; al cambiarla recalcula todo el carrito
- **`GET /api/payment-methods`** devuelve los métodos activos para cobrar
- **Todavía no hay endpoint de clientes**, así que la venta va sin cliente.
  El backend acepta `customerId` opcional, listo para cuando exista
- **Los movimientos de caja no se pueden listar:** `/sessions/current` solo
  devuelve `movementsCount`, no el detalle. La pantalla muestra los que se
  cargaron desde ahí y aclara cuántos lleva el turno según el servidor
- **El cierre es irreversible:** la sesión cerrada es inmutable y un segundo
  cierre devuelve 409, por eso el arqueo pide confirmación explícita
- `cashIn` del resumen incluye las ventas en efectivo, no solo los depósitos
  manuales
- El POS manda siempre el `unitPrice` de cada línea para que su total sea
  idéntico al que calcula el backend: la validación «pagos == total» es
  exacta y un centavo de diferencia rechaza la venta
- **El listado de productos no trae precios ni stock** (`productListInclude`
  del backend es solo categoría y ficha resumida), así que la tabla no tiene
  esas columnas: sacarlas exigiría una consulta por fila
- **Los costos son de solo lectura en el catálogo.** `lastCost` y
  `averageCost` se actualizan desde las recepciones de compra; el formulario
  los muestra sin editarlos y solo con `products.view_cost`
- **`plantDetail` solo se manda si el producto es de tipo `PLANT`**: el
  backend devuelve 400 si llega en un producto convencional. Y el `kind` no
  viaja en el PATCH, porque su schema no lo acepta
- Los booleanos de la ficha son de **tres estados**: `true`, `false` y `null`
  («sin dato»). El formulario los distingue en vez de colapsarlos a un check
