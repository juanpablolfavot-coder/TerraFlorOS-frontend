/**
 * Preparación del logo del vivero antes de guardarlo.
 *
 * El logo se guarda como data URL base64 dentro de una setting, así que
 * la imagen que sale del celular (3 MB, 4000 px) no puede viajar tal
 * cual: acá se redimensiona y comprime EN EL CLIENTE hasta un tamaño
 * razonable. El backend valida el formato y el largo, pero para cuando
 * llega ya viene chica.
 */

/** Ancho máximo del logo. En el comprobante se ve a ~180 px. */
export const MAX_ANCHO = 400;

/** Objetivo de peso: por debajo de esto no se sigue comprimiendo. */
export const OBJETIVO_BYTES = 200 * 1024;

/**
 * Tope duro. El backend acepta hasta 400.000 caracteres de data URL
 * (~300 KB de imagen); si ni comprimiendo se baja de acá, se avisa en
 * vez de mandar algo que va a rebotar con 400.
 */
export const MAXIMO_BYTES = 290 * 1024;

/** Los tres formatos que acepta el backend. */
export const FORMATOS_ACEPTADOS = ["image/png", "image/jpeg", "image/webp"] as const;

/** Peso real de la imagen que representa un data URL base64. */
export function bytesDeDataUrl(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const relleno = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - relleno);
}

/** KB con una decimal, para mostrarle al usuario cuánto pesa el logo. */
export function formatearPeso(bytes: number): string {
  return `${(bytes / 1024).toLocaleString("es-AR", { maximumFractionDigits: 1 })} KB`;
}

export class ImagenInvalida extends Error {}

/** Carga el archivo en un <img> para poder medirlo y dibujarlo. */
function cargarImagen(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ImagenInvalida("No se pudo leer la imagen. Probá con otro archivo PNG o JPG."));
    };
    img.src = url;
  });
}

/** Dibuja la imagen escalada; con `fondoBlanco` para los formatos sin alfa. */
function dibujar(img: HTMLImageElement, ancho: number, alto: number, fondoBlanco: boolean): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;

  const ctx = canvas.getContext("2d");
  if (ctx === null) throw new ImagenInvalida("El navegador no pudo procesar la imagen.");

  if (fondoBlanco) {
    // El JPEG no tiene transparencia: sin esto, el fondo sale negro
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, ancho, alto);
  }
  ctx.drawImage(img, 0, 0, ancho, alto);
  return canvas;
}

export interface LogoPreparado {
  dataUrl: string;
  bytes: number;
  ancho: number;
  alto: number;
  /** El archivo original se achicó (de tamaño o de peso). */
  redimensionada: boolean;
}

/**
 * Redimensiona y comprime una imagen a data URL.
 *
 * Prueba formatos de menos a más pérdida y se queda con el primero que
 * baje del objetivo: PNG (nítido y con transparencia) → WEBP → JPEG
 * sobre blanco. Un logo plano suele quedar en PNG; una foto termina en
 * JPEG, que es exactamente lo que conviene en cada caso.
 */
export async function prepararLogo(file: File): Promise<LogoPreparado> {
  if (!(FORMATOS_ACEPTADOS as readonly string[]).includes(file.type)) {
    throw new ImagenInvalida(
      "El logo tiene que ser una imagen PNG, JPG o WEBP. Convertila y volvé a intentar."
    );
  }

  const img = await cargarImagen(file);
  if (img.naturalWidth === 0 || img.naturalHeight === 0) {
    throw new ImagenInvalida("La imagen está vacía o dañada.");
  }

  const escala = Math.min(1, MAX_ANCHO / img.naturalWidth);
  const ancho = Math.max(1, Math.round(img.naturalWidth * escala));
  const alto = Math.max(1, Math.round(img.naturalHeight * escala));

  const conAlfa = dibujar(img, ancho, alto, false);
  const sinAlfa = dibujar(img, ancho, alto, true);

  const candidatos = [
    conAlfa.toDataURL("image/png"),
    conAlfa.toDataURL("image/webp", 0.9),
    conAlfa.toDataURL("image/webp", 0.75),
    sinAlfa.toDataURL("image/jpeg", 0.8),
    sinAlfa.toDataURL("image/jpeg", 0.6),
  ]
    // Un navegador sin soporte de webp devuelve un PNG: se descarta
    .filter((url) => url.startsWith("data:image/"));

  const elegido =
    candidatos.find((url) => bytesDeDataUrl(url) <= OBJETIVO_BYTES) ??
    candidatos.reduce((menor, url) => (bytesDeDataUrl(url) < bytesDeDataUrl(menor) ? url : menor));

  const bytes = bytesDeDataUrl(elegido);
  if (bytes > MAXIMO_BYTES) {
    throw new ImagenInvalida(
      `Incluso comprimida la imagen pesa ${formatearPeso(bytes)}. Probá con un logo más simple ` +
        "o recortado."
    );
  }

  return {
    dataUrl: elegido,
    bytes,
    ancho,
    alto,
    redimensionada: escala < 1 || bytes < file.size,
  };
}
