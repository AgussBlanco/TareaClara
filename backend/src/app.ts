import cors from "cors";
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
  /** Lanza un error si la base de datos no responde. */
  comprobarBase: () => Promise<void>;
}

export interface OpcionesApp {
  /** Cuántas peticiones de registro o login admite cada IP cada 15 minutos (RN-06). */
  limiteAuth: number;
  /** Direcciones del frontend que pueden llamar a la API desde un navegador. */
  origenesPermitidos: string[];
  /** Cuántos proxies hay delante del servidor, para leer la IP real del cliente. */
  confiarEnProxy: number;
}

const VENTANA_LIMITE_MS = 15 * 60 * 1000;

/** Arma la aplicación HTTP a partir de sus dependencias (no abre ningún puerto). */
export function crearApp({ tareaServicio, authServicio, comprobarBase }: Dependencias, opciones: OpcionesApp): Express {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", opciones.confiarEnProxy);

  // Solo los orígenes de la lista pueden leer las respuestas desde un navegador. Las peticiones sin origen
  // (curl, otro servidor) no pasan por CORS. No se usan cookies: la sesión viaja en el encabezado Authorization.
  app.use(
    cors({
      origin: opciones.origenesPermitidos,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      maxAge: 600,
    })
  );
  app.use(express.json({ limit: "100kb" })); // RN-30

  // Lo usa Render para saber si el servicio está sano: responde 200 solo si la base también responde.
  app.get("/api/salud", async (_req, res) => {
    try {
      await comprobarBase();
      res.json({ estado: "ok" });
    } catch (error) {
      console.error("La base de datos no responde:", error instanceof Error ? error.message : error);
      res.status(503).json({ error: { codigo: "BASE_NO_DISPONIBLE", mensaje: "La base de datos no responde." } });
    }
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
  origenesPermitidos?: string[];
  confiarEnProxy?: number;
}

/** Conecta las capas con la implementación PostgreSQL: Repositorio -> Servicio -> Controlador. */
export function componer(db: BaseDatos, configuracion: ConfiguracionApp): Express {
  const usuarios = new UsuarioRepositorioPg(db);
  return crearApp(
    {
      tareaServicio: new TareaServicio(new TareaRepositorioPg(db)),
      authServicio: new AuthServicio(usuarios, configuracion.jwtSecreto),
      comprobarBase: async () => {
        await db.consultar("SELECT 1");
      },
    },
    {
      limiteAuth: configuracion.limiteAuth ?? 10,
      origenesPermitidos: configuracion.origenesPermitidos ?? [],
      confiarEnProxy: configuracion.confiarEnProxy ?? 0,
    }
  );
}
