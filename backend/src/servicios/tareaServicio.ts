import { randomUUID } from "node:crypto";
import { ErrorConflicto, ErrorNoEncontrado } from "../dominio/errores";
import { esUuid } from "../dominio/ids";
import { MAX_MATERIAL_POR_TAREA, type Tarea } from "../dominio/tipos";
import type { TareaRepositorio } from "../repositorios/tareaRepositorio";
import { validarEdicionTarea, validarEstado, validarMaterial, validarNuevaTarea, validarOculta } from "./validacionesTarea";

export interface DependenciasServicio {
  generarId: () => string;
  ahora: () => Date;
}

const DEPENDENCIAS_POR_DEFECTO: DependenciasServicio = {
  generarId: () => randomUUID(),
  ahora: () => new Date(),
};

/**
 * Reglas de negocio de las tareas. No sabe nada de HTTP (req/res) ni de SQL:
 * recibe datos, aplica las reglas y le pide al repositorio que guarde o lea.
 */
export class TareaServicio {
  private readonly repositorio: TareaRepositorio;
  private readonly dependencias: DependenciasServicio;

  constructor(repositorio: TareaRepositorio, dependencias: DependenciasServicio = DEPENDENCIAS_POR_DEFECTO) {
    this.repositorio = repositorio;
    this.dependencias = dependencias;
  }

  /**
   * RN-14: crea una tarea para el usuario. El id, la fecha de creación y el estado inicial los decide
   * el servidor; el dueño siempre es el usuario autenticado, nunca un valor enviado en el cuerpo.
   */
  async crearTarea(usuarioId: string, entrada: unknown): Promise<Tarea> {
    const datos = validarNuevaTarea(entrada);

    const tarea: Tarea = {
      id: this.dependencias.generarId(),
      usuarioId,
      titulo: datos.titulo,
      descripcion: datos.descripcion,
      materia: datos.materia,
      fechaLimite: datos.fechaLimite,
      estado: "No completada",
      prioridad: datos.prioridad,
      nota: datos.nota,
      materialEstudio: [],
      oculta: false,
      fechaCreacion: this.dependencias.ahora().toISOString(),
      fechaCompletada: null,
    };

    return this.repositorio.crear(tarea);
  }

  listarTareas(usuarioId: string): Promise<Tarea[]> {
    return this.repositorio.listarPorUsuario(usuarioId);
  }

  /** RN-07: una tarea ajena, una que no existe y un id mal formado dan el mismo "no encontrada". */
  async obtenerTarea(usuarioId: string, id: string): Promise<Tarea> {
    const tarea = esUuid(id) ? await this.repositorio.buscarPorId(usuarioId, id) : null;
    if (!tarea) {
      throw new ErrorNoEncontrado("No se encontró la tarea.");
    }
    return tarea;
  }

  /** RN-18: cambia título, descripción, materia, fecha límite, prioridad y nota. No toca nada más. */
  async editarTarea(usuarioId: string, id: string, entrada: unknown): Promise<Tarea> {
    const actual = await this.obtenerTarea(usuarioId, id);
    const datos = validarEdicionTarea(entrada);
    return this.guardar({ ...actual, ...datos });
  }

  /** RN-20: borra la tarea y su material. */
  async eliminarTarea(usuarioId: string, id: string): Promise<void> {
    const eliminada = esUuid(id) ? await this.repositorio.eliminar(usuarioId, id) : false;
    if (!eliminada) {
      throw new ErrorNoEncontrado("No se encontró la tarea.");
    }
  }

  /**
   * RN-15 y RN-16: cambia el estado. Al pasar a Completada se anota cuándo; al salir de Completada se borra.
   * Pedir el estado que ya tiene no cambia nada (ni siquiera la fecha de completado).
   */
  async cambiarEstado(usuarioId: string, id: string, entrada: unknown): Promise<Tarea> {
    const actual = await this.obtenerTarea(usuarioId, id);
    const estado = validarEstado(entrada);
    if (estado === actual.estado) {
      return actual;
    }
    const fechaCompletada = estado === "Completada" ? this.dependencias.ahora().toISOString() : null;
    return this.guardar({ ...actual, estado, fechaCompletada });
  }

  /** RN-19: ocultar o volver a mostrar. No se pierde ningún dato. */
  async cambiarOculta(usuarioId: string, id: string, entrada: unknown): Promise<Tarea> {
    const actual = await this.obtenerTarea(usuarioId, id);
    const oculta = validarOculta(entrada);
    return oculta === actual.oculta ? actual : this.guardar({ ...actual, oculta });
  }

  /** RN-21 a RN-23: agrega un material a la tarea, hasta el máximo permitido. */
  async agregarMaterial(usuarioId: string, id: string, entrada: unknown): Promise<Tarea> {
    if (!esUuid(id)) {
      throw new ErrorNoEncontrado("No se encontró la tarea.");
    }
    const datos = validarMaterial(entrada);
    const resultado = await this.repositorio.agregarMaterial(
      usuarioId,
      id,
      { id: this.dependencias.generarId(), ...datos },
      MAX_MATERIAL_POR_TAREA
    );
    if (resultado.resultado === "no_existe") {
      throw new ErrorNoEncontrado("No se encontró la tarea.");
    }
    if (resultado.resultado === "limite") {
      throw new ErrorConflicto(`Una tarea puede tener como máximo ${MAX_MATERIAL_POR_TAREA} materiales.`);
    }
    return resultado.tarea;
  }

  /** RN-24: quita un material sin tocar el resto. Un material que no existe no es un error: la tarea queda igual. */
  async quitarMaterial(usuarioId: string, id: string, materialId: string): Promise<Tarea> {
    const tarea = esUuid(id) && esUuid(materialId) ? await this.repositorio.quitarMaterial(usuarioId, id, materialId) : null;
    if (!tarea) {
      throw new ErrorNoEncontrado("No se encontró el material.");
    }
    return tarea;
  }

  private async guardar(tarea: Tarea): Promise<Tarea> {
    const guardada = await this.repositorio.guardar(tarea);
    if (!guardada) {
      throw new ErrorNoEncontrado("No se encontró la tarea.");
    }
    return guardada;
  }
}
