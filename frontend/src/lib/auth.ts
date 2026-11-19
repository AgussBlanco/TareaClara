// Contraseñas con PBKDF2-SHA256 (Web Crypto). Formato guardado:
//   pbkdf2-sha256$<iteraciones>$<sal en base64>$<hash en base64>
// Importante: es un login LOCAL (los datos viven en el navegador), no seguridad real.

const ALGORITMO = "pbkdf2-sha256";
const ITERACIONES = 100_000;
const BYTES_SAL = 16;

function aBase64(bytes: Uint8Array): string {
  let texto = "";
  for (const byte of bytes) {
    texto += String.fromCharCode(byte);
  }
  return btoa(texto);
}

function desdeBase64(base64: string): Uint8Array<ArrayBuffer> {
  const texto = atob(base64);
  const bytes = new Uint8Array(texto.length);
  for (let i = 0; i < texto.length; i++) {
    bytes[i] = texto.charCodeAt(i);
  }
  return bytes;
}

async function derivarHash(
  contrasena: string,
  sal: Uint8Array<ArrayBuffer>,
  iteraciones: number
): Promise<Uint8Array> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error(
      "Este navegador no permite proteger contraseñas en esta dirección. Abre la app desde localhost o https."
    );
  }
  const clave = await subtle.importKey("raw", new TextEncoder().encode(contrasena), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: sal, iterations: iteraciones },
    clave,
    256
  );
  return new Uint8Array(bits);
}

function sonIguales(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diferencia = 0;
  for (let i = 0; i < a.length; i++) {
    diferencia |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diferencia === 0;
}

export async function hashearContrasena(contrasena: string): Promise<string> {
  const sal = new Uint8Array(BYTES_SAL);
  globalThis.crypto.getRandomValues(sal);
  const hash = await derivarHash(contrasena, sal, ITERACIONES);
  return [ALGORITMO, ITERACIONES, aBase64(sal), aBase64(hash)].join("$");
}

export async function verificarContrasena(contrasena: string, guardado: string): Promise<boolean> {
  const partes = guardado.split("$");
  if (partes.length !== 4 || partes[0] !== ALGORITMO) {
    return false;
  }
  const iteraciones = Number(partes[1]);
  if (!Number.isInteger(iteraciones) || iteraciones <= 0) {
    return false;
  }
  try {
    const sal = desdeBase64(partes[2] ?? "");
    const esperado = desdeBase64(partes[3] ?? "");
    const obtenido = await derivarHash(contrasena, sal, iteraciones);
    return sonIguales(obtenido, esperado);
  } catch {
    return false;
  }
}
