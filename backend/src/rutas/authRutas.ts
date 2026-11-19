import { Router, type RequestHandler } from "express";
import type { AuthControlador } from "../controladores/authControlador";

export function crearRutasAuth(controlador: AuthControlador, limitador: RequestHandler): Router {
  const router = Router();
  // RN-06: el límite de intentos solo aplica a registrarse y a iniciar sesión.
  router.post("/registro", limitador, controlador.registro);
  router.post("/login", limitador, controlador.login);
  router.get("/yo", controlador.yo);
  return router;
}
