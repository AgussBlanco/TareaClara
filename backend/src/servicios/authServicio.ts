import { randomUUID } from "node:crypto";
import { ErrorNoAutenticado } from "../dominio/errores";
import { esUuid } from "../dominio/ids";
import type { Usuario } from "../dominio/tipos";
import type { UsuarioRepositorio } from "../repositorios/usuarioRepositorio";
import { hashearContrasena, verificarContrasena } from "./contrasenas";
import { crearToken, verificarToken } from "./tokens";
import { validarLogin, validarRegistro } from "./validacionesAuth";

export interface Sesion {
  token: string;
  usuario: Usuario;
}

/** Reglas de cuentas y acceso (RN-01 a RN-05). No sabe nada de HTTP. */
export class AuthServicio {
  private readonly usuarios: UsuarioRepositorio;
  private readonly secretoJwt: string;
  private hashFalso: Promise<string> | null = null;

  constructor(usuarios: UsuarioRepositorio, secretoJwt: string) {
    this.usuarios = usuarios;
    this.secretoJwt = secretoJwt;
  }

  async registrar(entrada: unknown): Promise<Sesion> {
    const { nombre, email, contrasena } = validarRegistro(entrada);
    const usuario: Usuario = { id: randomUUID(), nombre, email };
    await this.usuarios.crear({ ...usuario, contrasenaHash: await hashearContrasena(contrasena) });
    return { token: crearToken(usuario.id, this.secretoJwt), usuario };
  }

  async iniciarSesion(entrada: unknown): Promise<Sesion> {
    const { email, contrasena } = validarLogin(entrada);
    const encontrado = await this.usuarios.buscarPorEmail(email);

    // RN-04: si el email no existe se hace igual el cálculo del hash, para que la respuesta tarde lo mismo
    // y no se pueda descubrir qué emails están registrados midiendo el tiempo.
    const hash = encontrado?.contrasenaHash ?? (await this.obtenerHashFalso());
    const correcta = await verificarContrasena(contrasena, hash);
    if (!encontrado || !correcta) {
      throw new ErrorNoAutenticado("El email o la contraseña no son correctos.");
    }

    const { contrasenaHash: _oculto, ...usuario } = encontrado;
    return { token: crearToken(usuario.id, this.secretoJwt), usuario };
  }

  /** RN-05: a partir del token, el usuario que hace la petición; si no es válido, ErrorNoAutenticado. */
  async usuarioDelToken(token: string): Promise<Usuario> {
    const id = verificarToken(token, this.secretoJwt);
    const usuario = id === null || !esUuid(id) ? null : await this.usuarios.buscarPorId(id);
    if (!usuario) {
      throw new ErrorNoAutenticado();
    }
    return usuario;
  }

  private obtenerHashFalso(): Promise<string> {
    this.hashFalso ??= hashearContrasena(randomUUID());
    return this.hashFalso;
  }
}
