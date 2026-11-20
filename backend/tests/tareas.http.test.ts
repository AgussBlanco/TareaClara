import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { BaseDatos } from "../src/db/baseDatos";
import { crearBaseMigrada } from "./ayudas/basePrueba";
import { crearCliente, iniciarServidor, registrarUsuario, type Cliente, type ServidorDePrueba } from "./ayudas/servidorPrueba";

// Pruebas de punta a punta: petición HTTP real -> controlador -> servicio -> repositorio -> PostgreSQL.

let db: BaseDatos;
let servidor: ServidorDePrueba;
let api: Cliente;
let ana: { token: string; id: string };
let luis: { token: string; id: string };

beforeAll(async () => {
  db = await crearBaseMigrada();
  servidor = await iniciarServidor(db);
  api = crearCliente(servidor.base);
});
afterAll(async () => {
  await servidor.cerrar();
  await db.cerrar();
});
beforeEach(async () => {
  await db.consultar("TRUNCATE usuarios CASCADE");
  ana = await registrarUsuario(api, "Ana");
  luis = await registrarUsuario(api, "Luis");
});

const valida = { titulo: "TP de funciones", materia: "Matemática", fechaLimite: "2026-12-01", prioridad: "Alta" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

async function crear(cuerpo: unknown = valida, token = ana.token) {
  return api.post("/api/tareas", cuerpo, token);
}

describe("POST /api/tareas", () => {
  it("RN-14: 201 con la tarea creada y su Location", async () => {
    const { estado, cuerpo, encabezados } = await crear({ ...valida, descripcion: "Ejercicios 1 al 5" });
    expect(estado).toBe(201);
    expect(encabezados.get("location")).toBe(`/api/tareas/${cuerpo.id}`);
    expect(cuerpo.id).toMatch(UUID);
    expect(cuerpo).toMatchObject({
      usuarioId: ana.id,
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
    expect(new Date(cuerpo.fechaCreacion).toISOString()).toBe(cuerpo.fechaCreacion);
  });

  it("RN-32: la tarea queda guardada en la base de datos", async () => {
    const { cuerpo } = await crear();
    const filas = await db.consultar<{ titulo: string }>("SELECT titulo FROM tareas WHERE id = $1", [cuerpo.id]);
    expect(filas[0]?.titulo).toBe("TP de funciones");
  });

  it("RN-14: ignora los campos que el cliente intenta forzar (dueño, id, estado, oculta)", async () => {
    const { cuerpo } = await crear({ ...valida, usuarioId: luis.id, id: "x", estado: "Completada", oculta: true });
    expect(cuerpo).toMatchObject({ usuarioId: ana.id, estado: "No completada", oculta: false });
    expect(cuerpo.id).toMatch(UUID);
  });

  it("RN-08: un título con SQL se guarda como texto y la tabla sigue existiendo", async () => {
    const titulo = "x'); DROP TABLE tareas; --";
    const { estado, cuerpo } = await crear({ ...valida, titulo });
    expect(estado).toBe(201);
    expect(cuerpo.titulo).toBe(titulo);
    expect((await api.get("/api/tareas", ana.token)).cuerpo).toHaveLength(1);
  });

  it("RN-08 a RN-11: 400 con el detalle de cada campo inválido", async () => {
    const { estado, cuerpo } = await crear({ titulo: "", fechaLimite: "2026-02-31", prioridad: "Urgente" });
    expect(estado).toBe(400);
    expect(cuerpo.error.codigo).toBe("VALIDACION");
    expect(cuerpo.error.detalles.map((d: { campo: string }) => d.campo).sort()).toEqual(["fechaLimite", "materia", "prioridad", "titulo"]);
  });

  it("RN-05: 401 sin token, antes de revisar el contenido", async () => {
    const { estado, cuerpo } = await crear({ titulo: "" }, "");
    expect(estado).toBe(401);
    expect(cuerpo.error.codigo).toBe("NO_AUTENTICADO");
  });
});

describe("GET /api/tareas", () => {
  it("RN-07: cada usuario ve solo sus tareas", async () => {
    await crear({ ...valida, titulo: "De Ana" });
    await crear({ ...valida, titulo: "De Luis" }, luis.token);
    expect((await api.get("/api/tareas", ana.token)).cuerpo.map((t: { titulo: string }) => t.titulo)).toEqual(["De Ana"]);
    expect((await api.get("/api/tareas", luis.token)).cuerpo.map((t: { titulo: string }) => t.titulo)).toEqual(["De Luis"]);
  });

  it("devuelve una lista vacía si no hay tareas", async () => {
    expect((await api.get("/api/tareas", ana.token)).cuerpo).toEqual([]);
  });
});

describe("GET /api/tareas/:id", () => {
  it("200 con la tarea", async () => {
    const { cuerpo: creada } = await crear();
    const { estado, cuerpo } = await api.get(`/api/tareas/${creada.id}`, ana.token);
    expect(estado).toBe(200);
    expect(cuerpo).toEqual(creada);
  });

  it("RN-07: 404 para la tarea de otro usuario, para una que no existe y para un id mal formado", async () => {
    const { cuerpo: deAna } = await crear();
    for (const id of [deAna.id, "00000000-0000-4000-8000-0000000000ff", "no-es-un-uuid"]) {
      const { estado, cuerpo } = await api.get(`/api/tareas/${id}`, luis.token);
      expect(estado).toBe(404);
      expect(cuerpo.error.codigo).toBe("NO_ENCONTRADO");
    }
  });
});

describe("PUT /api/tareas/:id", () => {
  const nuevos = { titulo: "Nuevo título", materia: "Lengua", fechaLimite: "2027-03-15", prioridad: "Baja", descripcion: "otra", nota: 9.5 };

  it("RN-18: 200 con la tarea editada y guardada", async () => {
    const { cuerpo: creada } = await crear();
    const { estado, cuerpo } = await api.put(`/api/tareas/${creada.id}`, nuevos, ana.token);
    expect(estado).toBe(200);
    expect(cuerpo).toMatchObject({ ...nuevos, id: creada.id, estado: "No completada", fechaCreacion: creada.fechaCreacion });
    expect((await api.get(`/api/tareas/${creada.id}`, ana.token)).cuerpo.titulo).toBe("Nuevo título");
  });

  it("RN-18: no cambia el material", async () => {
    const { cuerpo: creada } = await crear();
    await db.consultar("INSERT INTO material_estudio (id, tarea_id, titulo, tipo, contenido) VALUES ($1, $2, 'A', 'texto', 'a')", [
      "55555555-5555-4555-8555-555555555555",
      creada.id,
    ]);
    const { cuerpo } = await api.put(`/api/tareas/${creada.id}`, nuevos, ana.token);
    expect(cuerpo.materialEstudio).toHaveLength(1);
  });

  it("RN-18: 400 con detalle si los datos son inválidos y no cambia nada", async () => {
    const { cuerpo: creada } = await crear();
    const { estado, cuerpo } = await api.put(`/api/tareas/${creada.id}`, { ...nuevos, nota: 11 }, ana.token);
    expect(estado).toBe(400);
    expect(cuerpo.error.detalles[0].campo).toBe("nota");
    expect((await api.get(`/api/tareas/${creada.id}`, ana.token)).cuerpo.titulo).toBe("TP de funciones");
  });

  it("RN-07: 404 al editar la tarea de otro usuario, que queda intacta", async () => {
    const { cuerpo: deAna } = await crear();
    expect((await api.put(`/api/tareas/${deAna.id}`, nuevos, luis.token)).estado).toBe(404);
    expect((await api.get(`/api/tareas/${deAna.id}`, ana.token)).cuerpo.titulo).toBe("TP de funciones");
  });
});

describe("DELETE /api/tareas/:id", () => {
  it("RN-20: 204 y la tarea desaparece junto con su material", async () => {
    const { cuerpo: creada } = await crear();
    await db.consultar("INSERT INTO material_estudio (id, tarea_id, titulo, tipo, contenido) VALUES ($1, $2, 'A', 'texto', 'a')", [
      "55555555-5555-4555-8555-555555555555",
      creada.id,
    ]);
    const { estado, cuerpo } = await api.borrar(`/api/tareas/${creada.id}`, ana.token);
    expect(estado).toBe(204);
    expect(cuerpo).toBeNull();
    expect((await api.get(`/api/tareas/${creada.id}`, ana.token)).estado).toBe(404);
    expect(await db.consultar("SELECT id FROM material_estudio")).toHaveLength(0);
  });

  it("RN-07: 404 al eliminar la tarea de otro usuario, que sigue existiendo", async () => {
    const { cuerpo: deAna } = await crear();
    expect((await api.borrar(`/api/tareas/${deAna.id}`, luis.token)).estado).toBe(404);
    expect((await api.get(`/api/tareas/${deAna.id}`, ana.token)).estado).toBe(200);
  });
});
