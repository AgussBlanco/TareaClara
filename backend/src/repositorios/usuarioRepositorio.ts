import type { UsuarioNuevo } from "../dominio/tipos";

export interface UsuarioRepositorio {
  existePorId(id: string): Promise<boolean>;
  crear(usuario: UsuarioNuevo): Promise<void>;
}
