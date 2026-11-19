import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ErrorNoAutenticado } from "../dominio/errores";
import type { UsuarioRepositorio } from "../repositorios/usuarioRepositorio";

/**
 * TEMPORAL. Identifica al usuario por el encabezado "X-Usuario-Id" y comprueba que exista.
 * No es seguro: cualquiera podría hacerse pasar por otro usuario. Sirve para desarrollar
 * mientras no estén hechos el registro y el inicio de sesión.
 *
 * Cuando exista el login se reemplaza SOLO este middleware por uno que lea y verifique un
 * token (JWT) y deje el id en res.locals.usuarioId. Controlador, servicio y repositorio
 * no cambian, porque solo conocen ese valor y no cómo se obtuvo.
 */
export function crearIdentificarUsuario(usuarios: UsuarioRepositorio): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.header("x-usuario-id");
      if (!id || !(await usuarios.existePorId(id))) {
        throw new ErrorNoAutenticado();
      }
      res.locals.usuarioId = id;
      next();
    } catch (error) {
      next(error);
    }
  };
}
