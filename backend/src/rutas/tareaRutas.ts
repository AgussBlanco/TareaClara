import { Router } from "express";
import type { TareaControlador } from "../controladores/tareaControlador";

export function crearRutasTareas(controlador: TareaControlador): Router {
  const router = Router();
  router.post("/", controlador.crear);
  router.get("/", controlador.listar);
  router.get("/:id", controlador.obtener);
  router.put("/:id", controlador.editar);
  router.delete("/:id", controlador.eliminar);
  return router;
}
