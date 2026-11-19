import { ErrorValidacion, type DetalleValidacion } from "../dominio/errores";

export const LIMITES_CUENTA = { nombreMin: 2, nombreMax: 60, contrasenaMin: 8, contrasenaMax: 200, emailMax: 254 } as const;

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface DatosRegistro {
  nombre: string;
  email: string;
  contrasena: string;
}

export interface DatosLogin {
  email: string;
  contrasena: string;
}

function comoObjeto(entrada: unknown): Record<string, unknown> {
  if (typeof entrada !== "object" || entrada === null || Array.isArray(entrada)) {
    throw new ErrorValidacion([{ campo: "cuerpo", mensaje: "El cuerpo de la petición debe ser un objeto JSON." }]);
  }
  return entrada as Record<string, unknown>;
}

/** RN-02: el email se compara y se guarda siempre en minúsculas y sin espacios alrededor. */
export function normalizarEmail(valor: string): string {
  return valor.trim().toLowerCase();
}

/** RN-01: valida los datos de registro y los devuelve limpios. Reúne todos los errores a la vez. */
export function validarRegistro(entrada: unknown): DatosRegistro {
  const cuerpo = comoObjeto(entrada);
  const detalles: DetalleValidacion[] = [];

  const nombre = typeof cuerpo.nombre === "string" ? cuerpo.nombre.trim() : "";
  if (nombre.length < LIMITES_CUENTA.nombreMin || nombre.length > LIMITES_CUENTA.nombreMax) {
    detalles.push({ campo: "nombre", mensaje: `El nombre debe tener entre ${LIMITES_CUENTA.nombreMin} y ${LIMITES_CUENTA.nombreMax} caracteres.` });
  }

  const email = typeof cuerpo.email === "string" ? normalizarEmail(cuerpo.email) : "";
  if (!REGEX_EMAIL.test(email) || email.length > LIMITES_CUENTA.emailMax) {
    detalles.push({ campo: "email", mensaje: "El email no es válido." });
  }

  const contrasena = typeof cuerpo.contrasena === "string" ? cuerpo.contrasena : "";
  if (contrasena.length < LIMITES_CUENTA.contrasenaMin || contrasena.length > LIMITES_CUENTA.contrasenaMax) {
    detalles.push({
      campo: "contrasena",
      mensaje: `La contraseña debe tener entre ${LIMITES_CUENTA.contrasenaMin} y ${LIMITES_CUENTA.contrasenaMax} caracteres.`,
    });
  }

  if (detalles.length > 0) {
    throw new ErrorValidacion(detalles);
  }
  return { nombre, email, contrasena };
}

export function validarLogin(entrada: unknown): DatosLogin {
  const cuerpo = comoObjeto(entrada);
  const detalles: DetalleValidacion[] = [];

  const email = typeof cuerpo.email === "string" ? normalizarEmail(cuerpo.email) : "";
  if (email === "") {
    detalles.push({ campo: "email", mensaje: "El email es obligatorio." });
  }
  const contrasena = typeof cuerpo.contrasena === "string" ? cuerpo.contrasena : "";
  if (contrasena === "") {
    detalles.push({ campo: "contrasena", mensaje: "La contraseña es obligatoria." });
  } else if (contrasena.length > LIMITES_CUENTA.contrasenaMax) {
    detalles.push({ campo: "contrasena", mensaje: "La contraseña es demasiado larga." });
  }

  if (detalles.length > 0) {
    throw new ErrorValidacion(detalles);
  }
  return { email, contrasena };
}
