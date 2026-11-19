import type { Tarea } from "../dominio/tipos";

/**
 * Contrato de acceso a datos de las tareas. El servicio solo conoce esta interfaz:
 * cambiar SQLite por otra base implica escribir otra clase, no tocar las reglas de negocio.
 */
export interface TareaRepositorio {
  crear(tarea: Tarea): Promise<Tarea>;
  listarPorUsuario(usuarioId: string): Promise<Tarea[]>;
}
