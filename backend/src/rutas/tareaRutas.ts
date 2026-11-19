import { Router } from "express";
import type { TareaControlador } from "../controladores/tareaControlador";

export function crearRutasTareas(controlador: TareaControlador): Router {
  const router = Router();
  router.post("/", controlador.crear);
  router.get("/", controlador.listar);
  return router;
}
