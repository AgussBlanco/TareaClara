import { describe, expect, it, vi } from "vitest";
import { ErrorApi, crearApi } from "./api";

interface Llamada {
  url: string;
  init: RequestInit;
}

function crear(respuestas: Array<Response | Error>, token: string | null = "tok") {
  const llamadas: Llamada[] = [];
  const alVencerSesion = vi.fn();
  const fetchFn = (async (url: string, init: RequestInit) => {
    llamadas.push({ url, init });
    const r = respuestas.shift();
    if (!r) throw new Error("sin respuesta preparada");
    if (r instanceof Error) throw r;
    return r;
  }) as unknown as typeof fetch;
  const api = crearApi({
    baseUrl: "https://api.ejemplo.com",
    obtenerToken: () => token,
    alVencerSesion,
    fetchFn,
    timeoutMs: 50,
  });
  return { api, llamadas, alVencerSesion };
}

const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { "Content-Type": "application/json" } });

describe("cliente de la API", () => {
  it("envía el token como Bearer y el cuerpo como JSON", async () => {
    const { api, llamadas } = crear([json({ id: "t1" }, 201)]);
    await api.crearTarea({
      titulo: "TP",
      descripcion: "",
      materia: "Mate",
      fechaLimite: "2026-10-10",
      prioridad: "Alta",
      nota: null,
    });
    const { url, init } = llamadas[0];
    expect(url).toBe("https://api.ejemplo.com/api/tareas");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body as string).titulo).toBe("TP");
  });

  it("registro y login no mandan token", async () => {
    const { api, llamadas } = crear([json({ token: "x", usuario: {} }), json({ token: "y", usuario: {} })]);
    await api.registro({ nombre: "Ana", email: "a@b.co", contrasena: "12345678" });
    await api.login({ email: "a@b.co", contrasena: "12345678" });
    for (const l of llamadas) {
      expect((l.init.headers as Record<string, string>).Authorization).toBeUndefined();
    }
  });

  it("usa los métodos y rutas de cada operación, escapando los ids", async () => {
    const { api, llamadas } = crear([
      json({}),
      json({}),
      json({}),
      new Response(null, { status: 204 }),
      json({}),
      json({}),
    ]);
    await api.editarTarea("a b", {} as never);
    await api.cambiarEstado("t1", "Completada");
    await api.cambiarOculta("t1", true);
    await api.eliminarTarea("t1");
    await api.agregarMaterial("t1", { titulo: "x", tipo: "texto", contenido: "y" });
    await api.quitarMaterial("t1", "m1");
    expect(llamadas.map((l) => `${l.init.method} ${l.url.replace("https://api.ejemplo.com", "")}`)).toEqual([
      "PUT /api/tareas/a%20b",
      "PATCH /api/tareas/t1/estado",
      "PATCH /api/tareas/t1/oculta",
      "DELETE /api/tareas/t1",
      "POST /api/tareas/t1/material",
      "DELETE /api/tareas/t1/material/m1",
    ]);
    expect(JSON.parse(llamadas[1].init.body as string)).toEqual({ estado: "Completada" });
    expect(JSON.parse(llamadas[2].init.body as string)).toEqual({ oculta: true });
  });

  it("un 204 (eliminar) no intenta leer el cuerpo", async () => {
    const { api } = crear([new Response(null, { status: 204 })]);
    await expect(api.eliminarTarea("t1")).resolves.toBeUndefined();
  });

  it("convierte el error del servidor en ErrorApi con código y detalles por campo", async () => {
    const { api } = crear([
      json(
        {
          error: {
            codigo: "VALIDACION",
            mensaje: "Datos inválidos",
            detalles: [
              { campo: "titulo", mensaje: "El título es obligatorio." },
              { campo: "titulo", mensaje: "otra" },
              { campo: "nota", mensaje: "Nota inválida." },
            ],
          },
        },
        400
      ),
    ]);
    const error = await api.crearTarea({} as never).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorApi);
    const e = error as ErrorApi;
    expect([e.estado, e.codigo, e.message]).toEqual([400, "VALIDACION", "Datos inválidos"]);
    expect(e.detalles).toEqual({ titulo: "El título es obligatorio.", nota: "Nota inválida." });
  });

  it("RN-34: un 401 con sesión avisa para cerrarla; sin sesión (login) no", async () => {
    const con = crear([json({ error: { codigo: "NO_AUTENTICADO", mensaje: "Sesión vencida" } }, 401)]);
    await expect(con.api.listarTareas()).rejects.toMatchObject({ estado: 401, codigo: "NO_AUTENTICADO" });
    expect(con.alVencerSesion).toHaveBeenCalledTimes(1);

    const sin = crear([json({ error: { codigo: "NO_AUTENTICADO", mensaje: "Credenciales incorrectas" } }, 401)]);
    await expect(sin.api.login({ email: "a@b.co", contrasena: "x" })).rejects.toBeInstanceOf(ErrorApi);
    expect(sin.alVencerSesion).not.toHaveBeenCalled();
  });

  it("un 429 conserva el mensaje del servidor", async () => {
    const { api } = crear([json({ error: { codigo: "DEMASIADOS_INTENTOS", mensaje: "Esperá unos minutos." } }, 429)]);
    await expect(api.login({ email: "a@b.co", contrasena: "x" })).rejects.toMatchObject({
      estado: 429,
      message: "Esperá unos minutos.",
    });
  });

  it("una respuesta de error que no es JSON da un mensaje genérico", async () => {
    const { api } = crear([new Response("<html>Bad gateway</html>", { status: 502 })]);
    const e = (await api.listarTareas().catch((x: unknown) => x)) as ErrorApi;
    expect(e.estado).toBe(502);
    expect(e.codigo).toBe("ERROR_DESCONOCIDO");
    expect(e.message).not.toMatch(/html/i);
  });

  it("sin conexión da SIN_CONEXION", async () => {
    const { api } = crear([new TypeError("fetch failed")]);
    await expect(api.listarTareas()).rejects.toMatchObject({ estado: 0, codigo: "SIN_CONEXION" });
  });

  it("si el servidor no contesta a tiempo, corta y avisa como falta de conexión", async () => {
    const fetchFn = ((_: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(new DOMException("abort", "AbortError")));
      })) as unknown as typeof fetch;
    const api = crearApi({
      baseUrl: "https://x.com",
      obtenerToken: () => null,
      alVencerSesion: () => {},
      fetchFn,
      timeoutMs: 20,
    });
    await expect(api.listarTareas()).rejects.toMatchObject({ codigo: "SIN_CONEXION" });
  });

  it("una respuesta exitosa que no es JSON se rechaza", async () => {
    const { api } = crear([new Response("ok", { status: 200 })]);
    await expect(api.listarTareas()).rejects.toMatchObject({ codigo: "RESPUESTA_INVALIDA" });
  });
});
