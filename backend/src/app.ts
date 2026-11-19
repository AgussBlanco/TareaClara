import express, { type Express } from "express";
import type { BaseDeDatos } from "./db/conexion";
import { TareaControlador } from "./controladores/tareaControlador";
import { crearIdentificarUsuario } from "./middlewares/identificarUsuario";
import { manejadorErrores, rutaNoEncontrada } from "./middlewares/manejadorErrores";
import { TareaRepositorioSqlite } from "./repositorios/tareaRepositorioSqlite";
import type { UsuarioRepositorio } from "./repositorios/usuarioRepositorio";
import { UsuarioRepositorioSqlite } from "./repositorios/usuarioRepositorioSqlite";
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

/** Conecta las capas con la implementación SQLite: Repositorio -> Servicio -> Controlador. */
export function componer(db: BaseDeDatos): Express {
  return crearApp({
    tareaServicio: new TareaServicio(new TareaRepositorioSqlite(db)),
    usuarios: new UsuarioRepositorioSqlite(db),
  });
}
