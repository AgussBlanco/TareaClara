import type { MaterialEstudio, Tarea } from "../dominio/tipos";

export type ResultadoAgregarMaterial =
  | { resultado: "ok"; tarea: Tarea }
  | { resultado: "no_existe" }
  | { resultado: "limite" };

/**
 * Contrato de acceso a datos de las tareas. El servicio solo conoce esta interfaz: cambiar de base de datos
 * implica escribir otra clase, no tocar las reglas de negocio.
 * Todas las operaciones reciben el id del usuario y solo ven sus tareas (RN-07): si la tarea no es suya,
 * es como si no existiera.
 */
export interface TareaRepositorio {
  crear(tarea: Tarea): Promise<Tarea>;
  listarPorUsuario(usuarioId: string): Promise<Tarea[]>;
  buscarPorId(usuarioId: string, id: string): Promise<Tarea | null>;
  /** Guarda los datos de la tarea, su estado y si está oculta. No toca el material. Devuelve null si no existe. */
  guardar(tarea: Tarea): Promise<Tarea | null>;
  eliminar(usuarioId: string, id: string): Promise<boolean>;
  /** Agrega el material solo si la tarea tiene menos de `maximo` (RN-23), de forma segura ante pedidos simultáneos. */
  agregarMaterial(usuarioId: string, tareaId: string, material: MaterialEstudio, maximo: number): Promise<ResultadoAgregarMaterial>;
  quitarMaterial(usuarioId: string, tareaId: string, materialId: string): Promise<Tarea | null>;
}
