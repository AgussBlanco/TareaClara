import type { DatosTarea, EstadoTarea, MaterialEstudio, Tarea, Usuario } from "../types";

export class ErrorApi extends Error {
  constructor(
    mensaje: string,
    readonly estado: number,
    readonly codigo: string,
    readonly detalles: Record<string, string> = {}
  ) {
    super(mensaje);
    this.name = "ErrorApi";
  }
}

export interface RespuestaAcceso {
  token: string;
  usuario: Usuario;
}

export interface OpcionesApi {
  baseUrl: string;
  obtenerToken: () => string | null;
  /** Se llama cuando el servidor responde 401 a una petición con sesión (RN-34). */
  alVencerSesion: () => void;
  fetchFn?: typeof fetch;
  /** Cuánto esperar antes de rendirse; el plan gratuito de Render tarda en despertar. */
  timeoutMs?: number;
}

type DetallesCrudos = Array<{ campo?: unknown; mensaje?: unknown }>;

function aMapaDeDetalles(detalles: unknown): Record<string, string> {
  const mapa: Record<string, string> = {};
  if (Array.isArray(detalles)) {
    for (const d of detalles as DetallesCrudos) {
      if (typeof d?.campo === "string" && typeof d?.mensaje === "string" && !(d.campo in mapa)) {
        mapa[d.campo] = d.mensaje;
      }
    }
  }
  return mapa;
}

export function crearApi(opciones: OpcionesApi) {
  const hacerFetch = opciones.fetchFn ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const timeoutMs = opciones.timeoutMs ?? 60_000;

  async function pedir<T>(metodo: string, ruta: string, cuerpo?: unknown, conSesion = true): Promise<T> {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (cuerpo !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    const token = conSesion ? opciones.obtenerToken() : null;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const control = new AbortController();
    const temporizador = setTimeout(() => control.abort(), timeoutMs);
    let respuesta: Response;
    try {
      respuesta = await hacerFetch(`${opciones.baseUrl}${ruta}`, {
        method: metodo,
        headers,
        body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
        signal: control.signal,
      });
    } catch {
      throw new ErrorApi(
        "No se pudo conectar con el servidor. Revisá tu conexión e intentá de nuevo.",
        0,
        "SIN_CONEXION"
      );
    } finally {
      clearTimeout(temporizador);
    }

    if (respuesta.status === 204) {
      return undefined as T;
    }

    let datos: unknown = null;
    try {
      datos = await respuesta.json();
    } catch {
      datos = null;
    }

    if (!respuesta.ok) {
      const error = (datos as { error?: { codigo?: unknown; mensaje?: unknown; detalles?: unknown } } | null)
        ?.error;
      const codigo = typeof error?.codigo === "string" ? error.codigo : "ERROR_DESCONOCIDO";
      const mensaje =
        typeof error?.mensaje === "string"
          ? error.mensaje
          : "El servidor respondió con un error inesperado. Intentá de nuevo más tarde.";
      if (respuesta.status === 401 && token) {
        opciones.alVencerSesion();
      }
      throw new ErrorApi(mensaje, respuesta.status, codigo, aMapaDeDetalles(error?.detalles));
    }

    if (datos === null) {
      throw new ErrorApi("El servidor envió una respuesta que no se entiende.", respuesta.status, "RESPUESTA_INVALIDA");
    }
    return datos as T;
  }

  const id = encodeURIComponent;

  return {
    registro: (datos: { nombre: string; email: string; contrasena: string }) =>
      pedir<RespuestaAcceso>("POST", "/api/auth/registro", datos, false),
    login: (datos: { email: string; contrasena: string }) =>
      pedir<RespuestaAcceso>("POST", "/api/auth/login", datos, false),
    yo: () => pedir<Usuario>("GET", "/api/auth/yo"),
    listarTareas: () => pedir<Tarea[]>("GET", "/api/tareas"),
    crearTarea: (datos: DatosTarea) => pedir<Tarea>("POST", "/api/tareas", datos),
    editarTarea: (tareaId: string, datos: DatosTarea) => pedir<Tarea>("PUT", `/api/tareas/${id(tareaId)}`, datos),
    cambiarEstado: (tareaId: string, estado: EstadoTarea) =>
      pedir<Tarea>("PATCH", `/api/tareas/${id(tareaId)}/estado`, { estado }),
    cambiarOculta: (tareaId: string, oculta: boolean) =>
      pedir<Tarea>("PATCH", `/api/tareas/${id(tareaId)}/oculta`, { oculta }),
    eliminarTarea: (tareaId: string) => pedir<void>("DELETE", `/api/tareas/${id(tareaId)}`),
    agregarMaterial: (tareaId: string, material: Omit<MaterialEstudio, "id">) =>
      pedir<Tarea>("POST", `/api/tareas/${id(tareaId)}/material`, material),
    quitarMaterial: (tareaId: string, materialId: string) =>
      pedir<Tarea>("DELETE", `/api/tareas/${id(tareaId)}/material/${id(materialId)}`),
  };
}

export type Api = ReturnType<typeof crearApi>;
