import type { MaterialEstudio, Tarea } from "../../src/dominio/tipos";
import type { ResultadoAgregarMaterial, TareaRepositorio } from "../../src/repositorios/tareaRepositorio";

/**
 * Repositorio falso en memoria: permite probar las reglas de negocio del servicio sin base de datos.
 * Es posible justamente porque el servicio solo depende de la interfaz TareaRepositorio.
 */
export class RepositorioEnMemoria implements TareaRepositorio {
  readonly tareas: Tarea[] = [];

  async crear(tarea: Tarea): Promise<Tarea> {
    this.tareas.push(structuredClone(tarea));
    return structuredClone(tarea);
  }

  async listarPorUsuario(usuarioId: string): Promise<Tarea[]> {
    return structuredClone(this.tareas.filter((t) => t.usuarioId === usuarioId));
  }

  async buscarPorId(usuarioId: string, id: string): Promise<Tarea | null> {
    const tarea = this.tareas.find((t) => t.usuarioId === usuarioId && t.id === id);
    return tarea ? structuredClone(tarea) : null;
  }

  async guardar(tarea: Tarea): Promise<Tarea | null> {
    const indice = this.tareas.findIndex((t) => t.usuarioId === tarea.usuarioId && t.id === tarea.id);
    if (indice === -1) {
      return null;
    }
    // Igual que la base: guardar no toca el material.
    this.tareas[indice] = { ...structuredClone(tarea), materialEstudio: this.tareas[indice]!.materialEstudio };
    return structuredClone(this.tareas[indice]!);
  }

  async eliminar(usuarioId: string, id: string): Promise<boolean> {
    const indice = this.tareas.findIndex((t) => t.usuarioId === usuarioId && t.id === id);
    if (indice === -1) {
      return false;
    }
    this.tareas.splice(indice, 1);
    return true;
  }

  async agregarMaterial(
    usuarioId: string,
    tareaId: string,
    material: MaterialEstudio,
    maximo: number
  ): Promise<ResultadoAgregarMaterial> {
    const tarea = this.tareas.find((t) => t.usuarioId === usuarioId && t.id === tareaId);
    if (!tarea) {
      return { resultado: "no_existe" };
    }
    if (tarea.materialEstudio.length >= maximo) {
      return { resultado: "limite" };
    }
    tarea.materialEstudio.push({ ...material });
    return { resultado: "ok", tarea: structuredClone(tarea) };
  }

  async quitarMaterial(usuarioId: string, tareaId: string, materialId: string): Promise<Tarea | null> {
    const tarea = this.tareas.find((t) => t.usuarioId === usuarioId && t.id === tareaId);
    if (!tarea) {
      return null;
    }
    tarea.materialEstudio = tarea.materialEstudio.filter((m) => m.id !== materialId);
    return structuredClone(tarea);
  }
}
