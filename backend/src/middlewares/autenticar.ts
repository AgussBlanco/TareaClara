import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ErrorNoAutenticado } from "../dominio/errores";
import type { AuthServicio } from "../servicios/authServicio";

/**
 * RN-05: exige "Authorization: Bearer <token>" válido. Si lo es, deja el id del usuario en res.locals.usuarioId;
 * el dueño de los datos sale siempre de acá, nunca del cuerpo de la petición.
 */
export function crearAutenticar(auth: AuthServicio): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const encabezado = req.header("authorization") ?? "";
      const coincidencia = /^Bearer\s+(\S+)$/i.exec(encabezado);
      if (!coincidencia?.[1]) {
        throw new ErrorNoAutenticado();
      }
      const usuario = await auth.usuarioDelToken(coincidencia[1]);
      res.locals.usuarioId = usuario.id;
      next();
    } catch (error) {
      next(error);
    }
  };
}
