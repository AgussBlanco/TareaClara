import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ErrorNoAutenticado } from "../dominio/errores";
import type { UsuarioRepositorio } from "../repositorios/usuarioRepositorio";

const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * TEMPORAL (se reemplaza en T04 por la verificación del token JWT). Identifica al usuario por el encabezado
 * "X-Usuario-Id" y comprueba que exista. No es seguro: cualquiera podría hacerse pasar por otro.
 */
export function crearIdentificarUsuario(usuarios: UsuarioRepositorio): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.header("x-usuario-id");
      if (!id || !FORMATO_UUID.test(id) || (await usuarios.buscarPorId(id)) === null) {
        throw new ErrorNoAutenticado();
      }
      res.locals.usuarioId = id;
      next();
    } catch (error) {
      next(error);
    }
  };
}
