import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { componer } from "../src/app";
import { abrirBaseDeDatos, type BaseDeDatos } from "../src/db/conexion";
import { UsuarioRepositorioSqlite } from "../src/repositorios/usuarioRepositorioSqlite";

// Pruebas de punta a punta: petición HTTP real -> controlador -> servicio -> repositorio -> SQLite.

let db: BaseDeDatos;
let servidor: Server;
let base: string;

beforeAll(async () => {
  db = abrirBaseDeDatos(":memory:");
  const usuarios = new UsuarioRepositorioSqlite(db);
  await usuarios.crear({ id: "ana", nombre: "Ana", email: "ana@ejemplo.com", contrasenaHash: "!" });
  await usuarios.crear({ id: "luis", nombre: "Luis", email: "luis@ejemplo.com", contrasenaHash: "!" });

  servidor = componer(db).listen(0);
  await once(servidor, "listening");
  base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
});

afterAll(async () => {
  servidor.closeAllConnections();
  await new Promise<void>((resolver) => servidor.close(() => resolver()));
  db.close();
});

const valida = { titulo: "TP de funciones", materia: "Matemática", fechaLimite: "2026-12-01", prioridad: "Alta" };

function post(cuerpo: unknown, usuario: string | null = "ana"): Promise<Response> {
  return fetch(`${base}/api/tareas`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(usuario ? { "X-Usuario-Id": usuario } : {}) },
    body: JSON.stringify(cuerpo),
  });
}

function get(usuario: string | null = "ana"): Promise<Response> {
  return fetch(`${base}/api/tareas`, { headers: usuario ? { "X-Usuario-Id": usuario } : {} });
}

describe("POST /api/tareas", () => {
  it("201: crea la tarea y devuelve el recurso con su Location", async () => {
    const respuesta = await post({ ...valida, descripcion: "Ejercicios 1 al 5" });
    expect(respuesta.status).toBe(201);

    const tarea = await respuesta.json();
    expect(respuesta.headers.get("location")).toBe(`/api/tareas/${tarea.id}`);
    expect(tarea.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(tarea).toMatchObject({
      usuarioId: "ana",
      titulo: "TP de funciones",
      descripcion: "Ejercicios 1 al 5",
      materia: "Matemática",
      fechaLimite: "2026-12-01",
      estado: "No completada",
      prioridad: "Alta",
      nota: null,
      materialEstudio: [],
      oculta: false,
      fechaCompletada: null,
    });
    expect(new Date(tarea.fechaCreacion).toISOString()).toBe(tarea.fechaCreacion);
  });

  it("la tarea queda guardada en la base de datos", async () => {
    const tarea = await (await post({ ...valida, titulo: "Guardada en SQLite" })).json();
    const fila = db.prepare("SELECT usuario_id, titulo, estado, prioridad FROM tareas WHERE id = ?").get(tarea.id);
    expect(fila).toEqual({ usuario_id: "ana", titulo: "Guardada en SQLite", estado: "No completada", prioridad: "Alta" });
  });

  it("ignora los campos que el cliente intenta forzar (dueño, id, estado, nota)", async () => {
    const tarea = await (
      await post({ ...valida, usuarioId: "luis", id: "mio", estado: "Completada", nota: 10 })
    ).json();
    expect(tarea.usuarioId).toBe("ana");
    expect(tarea.id).not.toBe("mio");
    expect(tarea.estado).toBe("No completada");
    expect(tarea.nota).toBeNull();
  });

  it("guarda como texto un título con SQL (no se ejecuta) y la tabla sigue existiendo", async () => {
    const respuesta = await post({ ...valida, titulo: "'); DROP TABLE tareas; --" });
    expect(respuesta.status).toBe(201);
    expect(db.prepare("SELECT COUNT(*) AS n FROM tareas").get()).toMatchObject({ n: expect.any(Number) });
  });

  it("400: datos inválidos, con el detalle de cada campo", async () => {
    const respuesta = await post({ titulo: "", materia: "Lengua", fechaLimite: "2026-02-31", prioridad: "Urgente" });
    expect(respuesta.status).toBe(400);

    const { error } = await respuesta.json();
    expect(error.codigo).toBe("VALIDACION");
    expect(error.detalles.map((d: { campo: string }) => d.campo).sort()).toEqual(["fechaLimite", "prioridad", "titulo"]);
  });

  it("400: JSON mal formado", async () => {
    const respuesta = await fetch(`${base}/api/tareas`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Usuario-Id": "ana" },
      body: "{esto no es json",
    });
    expect(respuesta.status).toBe(400);
    expect((await respuesta.json()).error.codigo).toBe("JSON_INVALIDO");
  });

  it("400: petición sin cuerpo", async () => {
    const respuesta = await fetch(`${base}/api/tareas`, { method: "POST", headers: { "X-Usuario-Id": "ana" } });
    expect(respuesta.status).toBe(400);
    expect((await respuesta.json()).error.detalles[0].campo).toBe("cuerpo");
  });

  it("413: cuerpo demasiado grande", async () => {
    const respuesta = await post({ ...valida, descripcion: "x".repeat(200_000) });
    expect(respuesta.status).toBe(413);
  });

  it("401: sin encabezado de usuario", async () => {
    const respuesta = await post(valida, null);
    expect(respuesta.status).toBe(401);
    expect((await respuesta.json()).error.codigo).toBe("NO_AUTENTICADO");
  });

  it("401: usuario que no existe", async () => {
    expect((await post(valida, "fantasma")).status).toBe(401);
  });

  it("401 antes que 400: sin identificarse no se revisa ni el contenido", async () => {
    expect((await post({ titulo: "" }, null)).status).toBe(401);
  });
});

describe("GET /api/tareas", () => {
  it("200: cada usuario ve solo sus tareas", async () => {
    await post({ ...valida, titulo: "Solo de Luis" }, "luis");

    const deLuis = await (await get("luis")).json();
    expect(deLuis.map((t: { titulo: string }) => t.titulo)).toContain("Solo de Luis");
    expect(deLuis.every((t: { usuarioId: string }) => t.usuarioId === "luis")).toBe(true);

    const deAna = await (await get("ana")).json();
    expect(deAna.map((t: { titulo: string }) => t.titulo)).not.toContain("Solo de Luis");
    expect(deAna.every((t: { usuarioId: string }) => t.usuarioId === "ana")).toBe(true);
  });

  it("401 sin identificarse", async () => {
    expect((await get(null)).status).toBe(401);
  });
});

describe("otras rutas", () => {
  it("GET /api/salud responde ok sin identificarse", async () => {
    const respuesta = await fetch(`${base}/api/salud`);
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ estado: "ok" });
  });

  it("404 con el mismo formato de error para rutas que no existen", async () => {
    const respuesta = await fetch(`${base}/api/inexistente`);
    expect(respuesta.status).toBe(404);
    expect((await respuesta.json()).error.codigo).toBe("NO_ENCONTRADO");
  });

  it("no revela el framework en los encabezados", async () => {
    expect((await fetch(`${base}/api/salud`)).headers.get("x-powered-by")).toBeNull();
  });
});
