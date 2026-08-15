/**
 * Lecturas defensivas de respuestas del backend.
 *
 * No es para tapar errores nuestros: es para que una pantalla de solo
 * lectura —el panel, sobre todo— nunca quede en blanco porque un
 * endpoint devolvió algo distinto de lo esperado (una lista vacía, un
 * objeto sin una rama, `null` en vez de array). Mejor una tarjeta en
 * cero que la app rota.
 */

/**
 * Devuelve siempre un array. Si el valor no lo es (undefined, null, o un
 * objeto porque cambió la forma), devuelve uno vacío en vez de romper el
 * `.map` de la pantalla.
 */
export function comoLista<T>(value: readonly T[] | null | undefined): T[] {
  return Array.isArray(value) ? [...value] : [];
}

/**
 * Igual que `comoLista`, pero además saca los elementos vacíos: un
 * `null` colado en el array haría explotar el primer `item.campo` del
 * render.
 */
export function comoListaDeObjetos<T>(value: readonly T[] | null | undefined): T[] {
  return comoLista(value).filter(
    (item): item is T => item !== null && item !== undefined && typeof item === "object"
  );
}
