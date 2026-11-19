import { randomUUID } from "node:crypto";
import type { Tarea } from "../dominio/tipos";
import type { TareaRepositorio } from "../repositorios/tareaRepositorio";
import { validarNuevaTarea } from "./validacionesTarea";

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
   * Crea una tarea para el usuario. El id, la fecha de creación y el estado inicial los decide
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
      nota: null,
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
}
