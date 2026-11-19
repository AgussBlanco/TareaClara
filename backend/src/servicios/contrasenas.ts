import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// RN-03: la contraseña se guarda con scrypt y una sal aleatoria por usuario. Formato guardado:
//   scrypt$<N>$<r>$<p>$<sal en base64>$<hash en base64>
// Los parámetros viajan dentro del texto guardado, así se pueden subir más adelante sin romper las cuentas viejas.
const N = 16_384;
const R = 8;
const P = 1;
const BYTES_SAL = 16;
const BYTES_HASH = 64;
const N_MAXIMO = 2 ** 20; // tope de seguridad: un dato guardado alterado no puede pedir un costo desmedido

function derivar(contrasena: string, sal: Buffer, n: number, r: number, p: number, largo: number): Promise<Buffer> {
  return new Promise((resolver, rechazar) => {
    scrypt(contrasena, sal, largo, { N: n, r, p, maxmem: 256 * n * r }, (error, clave) => {
      if (error) {
        rechazar(error);
      } else {
        resolver(clave);
      }
    });
  });
}

export async function hashearContrasena(contrasena: string): Promise<string> {
  const sal = randomBytes(BYTES_SAL);
  const hash = await derivar(contrasena, sal, N, R, P, BYTES_HASH);
  return ["scrypt", N, R, P, sal.toString("base64"), hash.toString("base64")].join("$");
}

export async function verificarContrasena(contrasena: string, guardado: string): Promise<boolean> {
  const partes = guardado.split("$");
  if (partes.length !== 6 || partes[0] !== "scrypt") {
    return false;
  }
  const [n, r, p] = [Number(partes[1]), Number(partes[2]), Number(partes[3])];
  const parametrosValidos =
    Number.isInteger(n) && n >= 2 && n <= N_MAXIMO && (n & (n - 1)) === 0 &&
    Number.isInteger(r) && r >= 1 && r <= 16 &&
    Number.isInteger(p) && p >= 1 && p <= 4;
  if (!parametrosValidos) {
    return false;
  }
  try {
    const sal = Buffer.from(partes[4] ?? "", "base64");
    const esperado = Buffer.from(partes[5] ?? "", "base64");
    if (esperado.length === 0) {
      return false;
    }
    const obtenido = await derivar(contrasena, sal, n, r, p, esperado.length);
    return timingSafeEqual(obtenido, esperado);
  } catch {
    return false;
  }
}
