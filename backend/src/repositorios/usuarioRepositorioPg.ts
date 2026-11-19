import type { BaseDatos } from "../db/baseDatos";
import { ErrorConflicto } from "../dominio/errores";
import type { Usuario, UsuarioConHash } from "../dominio/tipos";
import type { UsuarioRepositorio } from "./usuarioRepositorio";

const CODIGO_VIOLACION_UNICA = "23505";

function esViolacionUnica(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === CODIGO_VIOLACION_UNICA;
}

/** Único lugar donde se escribe SQL de usuarios. */
export class UsuarioRepositorioPg implements UsuarioRepositorio {
  private readonly db: BaseDatos;

  constructor(db: BaseDatos) {
    this.db = db;
  }

  async crear(usuario: UsuarioConHash): Promise<void> {
    try {
      await this.db.consultar(
        "INSERT INTO usuarios (id, nombre, email, contrasena_hash) VALUES ($1, $2, $3, $4)",
        [usuario.id, usuario.nombre, usuario.email, usuario.contrasenaHash]
      );
    } catch (error) {
      if (esViolacionUnica(error)) {
        throw new ErrorConflicto("Ya existe una cuenta con ese email.");
      }
      throw error;
    }
  }

  async buscarPorEmail(email: string): Promise<UsuarioConHash | null> {
    const filas = await this.db.consultar<UsuarioConHash>(
      `SELECT id, nombre, email, contrasena_hash AS "contrasenaHash" FROM usuarios WHERE lower(email) = lower($1)`,
      [email]
    );
    return filas[0] ?? null;
  }

  async buscarPorId(id: string): Promise<Usuario | null> {
    const filas = await this.db.consultar<Usuario>("SELECT id, nombre, email FROM usuarios WHERE id = $1", [id]);
    return filas[0] ?? null;
  }
}
