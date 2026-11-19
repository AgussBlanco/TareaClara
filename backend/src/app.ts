import express, { type Express } from "express";
import type { BaseDatos } from "./db/baseDatos";
import { TareaControlador } from "./controladores/tareaControlador";
import { crearIdentificarUsuario } from "./middlewares/identificarUsuario";
import { manejadorErrores, rutaNoEncontrada } from "./middlewares/manejadorErrores";
import { TareaRepositorioPg } from "./repositorios/tareaRepositorioPg";
import type { UsuarioRepositorio } from "./repositorios/usuarioRepositorio";
import { UsuarioRepositorioPg } from "./repositorios/usuarioRepositorioPg";
import { crearRutasTareas } from "./rutas/tareaRutas";
import { TareaServicio } from "./servicios/tareaServicio";

export interface Dependencias {
  tareaServicio: TareaServicio;
  usuarios: UsuarioRepositorio;
}

/** Arma la aplicación HTTP a partir de sus dependencias (no abre ningún puerto). */
export function crearApp({ tareaServicio, usuarios }: Dependencias): Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "100kb" }));

  app.get("/api/salud", (_req, res) => {
    res.json({ estado: "ok" });
  });

  app.use("/api/tareas", crearIdentificarUsuario(usuarios), crearRutasTareas(new TareaControlador(tareaServicio)));

  app.use(rutaNoEncontrada);
  app.use(manejadorErrores);
  return app;
}

/** Conecta las capas con la implementación PostgreSQL: Repositorio -> Servicio -> Controlador. */
export function componer(db: BaseDatos): Express {
  return crearApp({
    tareaServicio: new TareaServicio(new TareaRepositorioPg(db)),
    usuarios: new UsuarioRepositorioPg(db),
  });
}
