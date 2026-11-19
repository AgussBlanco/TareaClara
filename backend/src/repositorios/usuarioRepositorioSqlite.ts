import type { BaseDeDatos } from "../db/conexion";
import type { UsuarioNuevo } from "../dominio/tipos";
import type { UsuarioRepositorio } from "./usuarioRepositorio";

export class UsuarioRepositorioSqlite implements UsuarioRepositorio {
  private readonly db: BaseDeDatos;

  constructor(db: BaseDeDatos) {
    this.db = db;
  }

  async existePorId(id: string): Promise<boolean> {
    return this.db.prepare("SELECT 1 FROM usuarios WHERE id = ?").get(id) !== undefined;
  }

  async crear(usuario: UsuarioNuevo): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO usuarios (id, nombre, email, contrasena_hash)
         VALUES (@id, @nombre, @email, @contrasenaHash)`
      )
      .run(usuario);
  }
}
