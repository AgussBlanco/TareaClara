import { ErrorConflicto } from "../../src/dominio/errores";
import type { Usuario, UsuarioConHash } from "../../src/dominio/tipos";
import type { UsuarioRepositorio } from "../../src/repositorios/usuarioRepositorio";

export class UsuarioRepositorioEnMemoria implements UsuarioRepositorio {
  readonly usuarios: UsuarioConHash[] = [];

  async crear(usuario: UsuarioConHash): Promise<void> {
    if (this.usuarios.some((u) => u.email.toLowerCase() === usuario.email.toLowerCase())) {
      throw new ErrorConflicto("Ya existe una cuenta con ese email.");
    }
    this.usuarios.push({ ...usuario });
  }

  async buscarPorEmail(email: string): Promise<UsuarioConHash | null> {
    return this.usuarios.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
  }

  async buscarPorId(id: string): Promise<Usuario | null> {
    const u = this.usuarios.find((x) => x.id === id);
    return u ? { id: u.id, nombre: u.nombre, email: u.email } : null;
  }
}
