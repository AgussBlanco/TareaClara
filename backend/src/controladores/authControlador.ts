import type { Request, Response } from "express";
import { ErrorNoAutenticado } from "../dominio/errores";
import type { AuthServicio } from "../servicios/authServicio";

/** Capa HTTP de cuentas: lee la petición, llama al servicio y arma la respuesta. */
export class AuthControlador {
  private readonly servicio: AuthServicio;

  constructor(servicio: AuthServicio) {
    this.servicio = servicio;
  }

  // POST /api/auth/registro -> 201 { token, usuario }
  registro = async (req: Request, res: Response): Promise<void> => {
    res.status(201).json(await this.servicio.registrar(req.body));
  };

  // POST /api/auth/login -> 200 { token, usuario }
  login = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.servicio.iniciarSesion(req.body));
  };

  // GET /api/auth/yo -> 200 usuario (lo usa el frontend para saber si la sesión guardada sigue siendo válida)
  yo = async (req: Request, res: Response): Promise<void> => {
    const coincidencia = /^Bearer\s+(\S+)$/i.exec(req.header("authorization") ?? "");
    if (!coincidencia?.[1]) {
      throw new ErrorNoAutenticado();
    }
    res.json(await this.servicio.usuarioDelToken(coincidencia[1]));
  };
}
