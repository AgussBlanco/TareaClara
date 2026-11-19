import express, { type Express } from "express";
import { rateLimit } from "express-rate-limit";
import type { BaseDatos } from "./db/baseDatos";
import { AuthControlador } from "./controladores/authControlador";
import { TareaControlador } from "./controladores/tareaControlador";
import { crearAutenticar } from "./middlewares/autenticar";
import { manejadorErrores, rutaNoEncontrada } from "./middlewares/manejadorErrores";
import { TareaRepositorioPg } from "./repositorios/tareaRepositorioPg";
import { UsuarioRepositorioPg } from "./repositorios/usuarioRepositorioPg";
import { crearRutasAuth } from "./rutas/authRutas";
import { crearRutasTareas } from "./rutas/tareaRutas";
import { AuthServicio } from "./servicios/authServicio";
import { TareaServicio } from "./servicios/tareaServicio";

export interface Dependencias {
  tareaServicio: TareaServicio;
  authServicio: AuthServicio;
}

export interface OpcionesApp {
  /** Cuántas peticiones de registro o login admite cada IP cada 15 minutos (RN-06). */
  limiteAuth: number;
}

const VENTANA_LIMITE_MS = 15 * 60 * 1000;

/** Arma la aplicación HTTP a partir de sus dependencias (no abre ningún puerto). */
export function crearApp({ tareaServicio, authServicio }: Dependencias, opciones: OpcionesApp): Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "100kb" })); // RN-30

  app.get("/api/salud", (_req, res) => {
    res.json({ estado: "ok" });
  });

  const limitador = rateLimit({
    windowMs: VENTANA_LIMITE_MS,
    limit: opciones.limiteAuth,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        error: { codigo: "DEMASIADOS_INTENTOS", mensaje: "Hiciste demasiados intentos. Esperá unos minutos y probá de nuevo." },
      });
    },
  });

  app.use("/api/auth", crearRutasAuth(new AuthControlador(authServicio), limitador));
  app.use("/api/tareas", crearAutenticar(authServicio), crearRutasTareas(new TareaControlador(tareaServicio)));

  app.use(rutaNoEncontrada);
  app.use(manejadorErrores);
  return app;
}

export interface ConfiguracionApp {
  jwtSecreto: string;
  limiteAuth?: number;
}

/** Conecta las capas con la implementación PostgreSQL: Repositorio -> Servicio -> Controlador. */
export function componer(db: BaseDatos, configuracion: ConfiguracionApp): Express {
  const usuarios = new UsuarioRepositorioPg(db);
  return crearApp(
    {
      tareaServicio: new TareaServicio(new TareaRepositorioPg(db)),
      authServicio: new AuthServicio(usuarios, configuracion.jwtSecreto),
    },
    { limiteAuth: configuracion.limiteAuth ?? 10 }
  );
}
