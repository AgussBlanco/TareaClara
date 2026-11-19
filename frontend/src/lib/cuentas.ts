import type { Usuario } from "../types";
import { hashearContrasena, verificarContrasena } from "./auth";
import { generarId } from "./utilidades";
import {
  normalizarEmail,
  validarLogin,
  validarRegistro,
  type BorradorLogin,
  type BorradorRegistro,
  type Errores,
} from "./validaciones";

export type ResultadoCuenta = { ok: true; usuario: Usuario } | { ok: false; errores: Errores };

export async function crearUsuario(
  existentes: Usuario[],
  borrador: BorradorRegistro
): Promise<ResultadoCuenta> {
  const validacion = validarRegistro(borrador);
  if (!validacion.ok) {
    return validacion;
  }

  const { nombre, email, contrasena } = validacion.datos;
  if (existentes.some((u) => normalizarEmail(u.email) === email)) {
    return { ok: false, errores: { email: "Ya existe una cuenta con ese email." } };
  }

  return {
    ok: true,
    usuario: { id: generarId(), nombre, email, contrasenaHash: await hashearContrasena(contrasena) },
  };
}

export async function autenticar(
  usuarios: Usuario[],
  borrador: BorradorLogin
): Promise<ResultadoCuenta> {
  const validacion = validarLogin(borrador);
  if (!validacion.ok) {
    return validacion;
  }

  const { email, contrasena } = validacion.datos;
  const usuario = usuarios.find((u) => normalizarEmail(u.email) === email);

  // Mismo mensaje si falla el email o la contraseña: no se revela cuál de los dos es.
  if (!usuario || !(await verificarContrasena(contrasena, usuario.contrasenaHash))) {
    return { ok: false, errores: { general: "El email o la contraseña no son correctos." } };
  }
  return { ok: true, usuario };
}
