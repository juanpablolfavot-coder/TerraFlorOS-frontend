# Changelog — TerraFlorOS frontend

## [0.4.0] — Gestión de caja: movimientos y cierre con arqueo

- **Movimientos manuales** (requiere `cash.movement`, oculto con `<Can>`):
  alta de gasto, retiro o depósito con descripción obligatoria. Al
  registrarlo se refresca el resumen del turno, así que el efectivo esperado
  se actualiza en el momento
- **Cierre con arqueo** (requiere `cash.close`): diálogo en dos pasos —
  primero se declara el efectivo contado y se ve la diferencia contra lo
  esperado, y recién después se confirma. El cierre es irreversible, así que
  la confirmación es explícita
- La diferencia se muestra en vivo mientras se tipea: verde si cuadra,
  ámbar si hay faltante, celeste si hay sobrante. Sin dramatizar
- Al cerrar se muestra el resumen final (esperado, contado, diferencia) y la
  pantalla vuelve al estado «sin caja abierta»
- Un usuario con `sales.create` pero sin `cash.movement` ni `cash.close` ve
  el resumen del turno sin los botones de mover ni cerrar. La ruta `/caja` y
  su ítem de menú se abrieron a `sales.create` para reflejar lo que ya
  permite el backend en las lecturas

### Limitación del backend

- **No hay endpoint que liste los movimientos de una sesión.**
  `/sessions/current` devuelve solo `movementsCount`. La tabla lista los
  movimientos cargados desde esa pantalla y aclara el total del turno según
  el servidor, en vez de aparentar un historial completo

## [0.3.0] — POS alineado con los endpoints nuevos del backend

- `POST /api/cash/sessions` ahora manda **`registerId`** (antes
  `cashRegisterId`). El backend unificó el nombre y su schema es `.strict()`,
  así que el anterior devolvía 400
- **Métodos de pago reales:** el panel de cobro consume
  `GET /api/payment-methods`. Se quitó la degradación que deshabilitaba el
  cobro por falta del endpoint; ahora el cobro se habilita normalmente
- **Listas de precios del backend:** `GET /api/price-lists` devuelve las
  activas con la default primera, y el POS la usa como precio base en vez de
  deducirla de los precios cargados. Si hay más de una se puede elegir, y
  cambiarla recalcula todo el carrito
- **Un vendedor sin `cash.open` ya puede vender.** El backend pasó las
  lecturas de caja a `sales.create` O `cash.open`; el guard del POS exigía
  `cash.open` y habría anulado ese arreglo, dejando al vendedor sin poder
  facturar. Abrir la caja sigue requiriendo `cash.open`

## [0.2.0] — POS de ventas y apertura de caja

- **Apertura de caja** (`/caja`, y como primer paso del POS): elegir caja de
  la sucursal y declarar el saldo inicial. Las cajas ya abiertas se muestran
  deshabilitadas con quién y cuándo la abrió. Sin el permiso `cash.open` se
  explica que hay que pedírselo a un encargado
- **Estado del turno** en `/caja`: saldo inicial, ingresos, egresos, efectivo
  esperado y cobros por medio de pago, con el resumen en vivo del backend
- **POS de ventas** (`/ventas`, permiso `sales.create`), en dos zonas:
  - Un solo buscador que sirve para escanear y para buscar. Enter busca el
    código exacto por `/by-barcode/:code` y lo manda derecho al carrito; al
    tipear muestra resultados por nombre o SKU con debounce. Después de cada
    alta el foco vuelve al buscador: se carga una venta entera sin el mouse
  - Carrito con cantidad editable, precio unitario (bloqueado sin
    `sales.discount`), subtotal por línea y total grande
  - Panel de cobro con **pago mixto**: varias filas método + monto, con
    cuánto falta o sobra en vivo. Cobrar se habilita solo cuando la suma da
    exacta, que es lo que exige el backend
  - Errores por acción: el 409 de stock dice qué producto y cuánto hay; el
    409 de caja vuelve a la pantalla de apertura
  - Confirmación antes de vaciar el carrito
- Los ítems de menú **Ventas** y **Caja** dejaron de ser provisorios
- Nuevos componentes `Modal` y `ConfirmDialog` en `components/ui/`

### Diferencias con el contrato que encontramos en el backend

- `POST /api/cash/sessions` recibe **`cashRegisterId`**, no `registerId`, y su
  schema es `.strict()`: mandar el otro nombre devuelve 400. El resto de los
  endpoints sí usa `registerId`
- **`GET /api/payment-methods` no existe.** Sin él no se puede cobrar: el POS
  muestra el motivo y deja el botón deshabilitado, pero el carrito y los
  totales siguen funcionando. No se cablearon ids fijos a propósito, porque
  cobrar con el método equivocado sería un error silencioso en los datos
- **`GET /api/price-lists` no existe** y el detalle de producto no dice cuál
  es la lista por defecto. El POS deduce las listas de los precios de los
  productos cargados y, si hay más de una, deja elegir. Manda siempre el
  `unitPrice` para que su total sea idéntico al del backend
- **No hay endpoint de clientes**, así que la venta va sin cliente. El
  backend acepta `customerId` opcional, listo para cuando exista

### Corregido

- Choque de utilidades de Tailwind: los controles de `ui/` traen `w-full` y
  pasarles un `w-*` por `className` dejaba compitiendo dos anchos, con el
  selector de método de pago aplastado. Los anchos fijos ahora van en un
  contenedor

## [0.1.1] — El refresh de sesión ya no manda cuerpo

- `POST /api/auth/refresh` y `POST /api/auth/logout` viajaban con el literal
  `null` como cuerpo y `Content-Type: application/json`. El `express.json()`
  del backend está en modo strict, que solo acepta objetos y arrays: rechazaba
  la request con **400 `entity.parse.failed`** antes de llegar a la ruta
- Efecto para el usuario: al recargar la página con sesión activa, el refresh
  fallaba y la sesión no se restauraba — volvía a la pantalla de login
- Causa raíz: la instancia de Axios fijaba `Content-Type: application/json`
  por defecto. Con ese header, `transformRequest` serializa **también** los
  cuerpos vacíos, y `null` se convierte en el texto `"null"`. Se quitó el
  header por defecto: Axios ya lo agrega solo cuando hay un objeto como
  cuerpo, así que las requests con datos siguen igual y las que no llevan
  cuerpo ahora no mandan nada
- Las llamadas sin cuerpo pasan `undefined` en vez de `null`, con el motivo
  anotado al lado para que no vuelva a colarse
- Verificado contra un Express real con `express.json()` strict, cookies y
  CORS: `POST /api/auth/refresh` sale sin `Content-Type` y sin cuerpo, da 401
  al cargar sin sesión y 200 al recargar con sesión activa, que se restaura
  correctamente

## [0.1.0] — Base del frontend

- Proyecto React 19 + TypeScript sobre Vite, con React Router v6, TanStack
  Query v5, Axios y Tailwind CSS v4. Sin librería de componentes: los
  controles propios viven en `src/components/ui/`
- Cliente HTTP con `baseURL` desde `VITE_API_URL` y `withCredentials`, para
  que viaje la cookie httpOnly del refresh token
- Ante un 401 se intenta refrescar la sesión **una sola vez** y se reintenta
  la request original con el token nuevo; si el refresh también falla, se
  limpia la sesión y se redirige a `/login`. La request reintentada queda
  marcada para que un segundo 401 no entre en un bucle
- Un único refresh en vuelo: el backend rota el refresh token y trata el reuso
  como robo, así que varias requests fallando a la vez comparten la misma
  petición en lugar de revocarle todas las sesiones al usuario
- Access token solo en memoria, nunca en `localStorage`. Al montar la app se
  intenta restaurar la sesión con la cookie y se cargan usuario y permisos
  efectivos desde `GET /api/auth/me`, con pantalla de carga mientras tanto
- Guards de ruta (`RequireAuth`, `RequirePermission`) y componente `<Can>`
  para elementos sueltos. Es solo interfaz: la autorización la aplica el
  backend en cada endpoint
- Layout con menú lateral filtrado por permisos y drawer en móvil; la raíz
  redirige al primer módulo que el usuario pueda ver
- **Panel**: ventas del día, medios de pago, plantas e inventario
- **Productos**: listado con búsqueda, filtros por tipo, categoría y estado, y
  paginación
- Pantallas provisorias para Ventas, Caja, Inventario, Compras, Proveedores y
  Usuarios, ya con su ruta y su permiso
- Los `Decimal` de Prisma llegan como string en el JSON y los campos de costo
  solo viajan con `products.view_cost`: los tipos y los helpers de formato
  contemplan ambas cosas
