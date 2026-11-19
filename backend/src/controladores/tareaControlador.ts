import type { Request, Response } from "express";
import { ErrorNoAutenticado } from "../dominio/errores";
import type { TareaServicio } from "../servicios/tareaServicio";

/** Quién hace la petición. Lo deja puesto el middleware de identificación. */
function usuarioIdDe(res: Response): string {
  const id: unknown = res.locals.usuarioId;
  if (typeof id !== "string" || id === "") {
    throw new ErrorNoAutenticado();
  }
  return id;
}

/**
 * Capa HTTP: lee la petición, llama al servicio y arma la respuesta con su código de estado.
 * No tiene reglas de negocio ni SQL.
 */
export class TareaControlador {
  private readonly servicio: TareaServicio;

  constructor(servicio: TareaServicio) {
    this.servicio = servicio;
  }

  // POST /api/tareas  ->  201 Created + Location
  crear = async (req: Request, res: Response): Promise<void> => {
    const tarea = await this.servicio.crearTarea(usuarioIdDe(res), req.body);
    res.status(201).location(`/api/tareas/${tarea.id}`).json(tarea);
  };

  // GET /api/tareas  ->  200 OK
  listar = async (_req: Request, res: Response): Promise<void> => {
    res.json(await this.servicio.listarTareas(usuarioIdDe(res)));
  };
}
