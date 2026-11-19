import type { Usuario, UsuarioConHash } from "../dominio/tipos";

export interface UsuarioRepositorio {
  /** Guarda un usuario nuevo. Si el email ya existe lanza ErrorConflicto (RN-02). */
  crear(usuario: UsuarioConHash): Promise<void>;
  buscarPorEmail(email: string): Promise<UsuarioConHash | null>;
  buscarPorId(id: string): Promise<Usuario | null>;
}
