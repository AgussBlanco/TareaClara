import type { Request, Response } from "express";
import { ErrorNoAutenticado } from "../dominio/errores";
import type { TareaServicio } from "../servicios/tareaServicio";

/** Quién hace la petición. Lo deja puesto el middleware de autenticación (RN-05). */
function usuarioIdDe(res: Response): string {
  const id: unknown = res.locals.usuarioId;
  if (typeof id !== "string" || id === "") {
    throw new ErrorNoAutenticado();
  }
  return id;
}

function idDe(req: Request): string {
  const id = req.params.id;
  return typeof id === "string" ? id : "";
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

  // GET /api/tareas/:id  ->  200 OK
  obtener = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.servicio.obtenerTarea(usuarioIdDe(res), idDe(req)));
  };

  // PUT /api/tareas/:id  ->  200 OK
  editar = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.servicio.editarTarea(usuarioIdDe(res), idDe(req), req.body));
  };

  // DELETE /api/tareas/:id  ->  204 No Content
  eliminar = async (req: Request, res: Response): Promise<void> => {
    await this.servicio.eliminarTarea(usuarioIdDe(res), idDe(req));
    res.status(204).end();
  };

  // PATCH /api/tareas/:id/estado  ->  200 OK
  cambiarEstado = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.servicio.cambiarEstado(usuarioIdDe(res), idDe(req), req.body));
  };

  // PATCH /api/tareas/:id/oculta  ->  200 OK
  cambiarOculta = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.servicio.cambiarOculta(usuarioIdDe(res), idDe(req), req.body));
  };

  // POST /api/tareas/:id/material  ->  201 Created (devuelve la tarea completa)
  agregarMaterial = async (req: Request, res: Response): Promise<void> => {
    res.status(201).json(await this.servicio.agregarMaterial(usuarioIdDe(res), idDe(req), req.body));
  };

  // DELETE /api/tareas/:id/material/:materialId  ->  200 OK (devuelve la tarea completa)
  quitarMaterial = async (req: Request, res: Response): Promise<void> => {
    const materialId = typeof req.params.materialId === "string" ? req.params.materialId : "";
    res.json(await this.servicio.quitarMaterial(usuarioIdDe(res), idDe(req), materialId));
  };
}
