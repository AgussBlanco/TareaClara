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

describe("PATCH /api/tareas/:id/estado", () => {
  it("RN-15 y RN-16: 200, cambia el estado y guarda la fecha de completado; al volver la borra", async () => {
    const { cuerpo: creada } = await crear();
    const completada = await api.patch(`/api/tareas/${creada.id}/estado`, { estado: "Completada" }, ana.token);
    expect(completada.estado).toBe(200);
    expect(completada.cuerpo.estado).toBe("Completada");
    expect(new Date(completada.cuerpo.fechaCompletada).toISOString()).toBe(completada.cuerpo.fechaCompletada);

    const vuelta = await api.patch(`/api/tareas/${creada.id}/estado`, { estado: "En proceso" }, ana.token);
    expect(vuelta.cuerpo).toMatchObject({ estado: "En proceso", fechaCompletada: null });
    expect((await api.get(`/api/tareas/${creada.id}`, ana.token)).cuerpo.estado).toBe("En proceso");
  });

  it("RN-15: 400 con un estado inválido", async () => {
    const { cuerpo: creada } = await crear();
    const { estado, cuerpo } = await api.patch(`/api/tareas/${creada.id}/estado`, { estado: "Terminada" }, ana.token);
    expect(estado).toBe(400);
    expect(cuerpo.error.detalles[0].campo).toBe("estado");
  });

  it("RN-07: 404 si la tarea es de otro usuario", async () => {
    const { cuerpo: deAna } = await crear();
    expect((await api.patch(`/api/tareas/${deAna.id}/estado`, { estado: "Completada" }, luis.token)).estado).toBe(404);
  });
});

describe("PATCH /api/tareas/:id/oculta", () => {
  it("RN-19: oculta y vuelve a mostrar, conservando todos los datos", async () => {
    const { cuerpo: creada } = await crear({ ...valida, nota: 8 });
    const oculta = await api.patch(`/api/tareas/${creada.id}/oculta`, { oculta: true }, ana.token);
    expect(oculta.cuerpo).toEqual({ ...creada, oculta: true });
    const visible = await api.patch(`/api/tareas/${creada.id}/oculta`, { oculta: false }, ana.token);
    expect(visible.cuerpo).toEqual(creada);
  });

  it("RN-19: 400 si oculta no es true o false", async () => {
    const { cuerpo: creada } = await crear();
    expect((await api.patch(`/api/tareas/${creada.id}/oculta`, { oculta: "si" }, ana.token)).estado).toBe(400);
  });
});

describe("material de estudio", () => {
  const apunte = { titulo: "Resumen", tipo: "texto", contenido: "Las funciones lineales..." };

  it("RN-21: POST agrega el material y devuelve la tarea completa", async () => {
    const { cuerpo: creada } = await crear();
    const { estado, cuerpo } = await api.post(`/api/tareas/${creada.id}/material`, apunte, ana.token);
    expect(estado).toBe(201);
    expect(cuerpo.materialEstudio).toHaveLength(1);
    expect(cuerpo.materialEstudio[0]).toMatchObject(apunte);
    expect(cuerpo.materialEstudio[0].id).toMatch(UUID);
    expect((await api.get(`/api/tareas/${creada.id}`, ana.token)).cuerpo.materialEstudio).toHaveLength(1);
  });

  it("RN-22: 400 si un enlace no es http o https", async () => {
    const { cuerpo: creada } = await crear();
    const { estado, cuerpo } = await api.post(`/api/tareas/${creada.id}/material`, { titulo: "x", tipo: "link", contenido: "javascript:alert(1)" }, ana.token);
    expect(estado).toBe(400);
    expect(cuerpo.error.detalles[0].campo).toBe("contenido");
  });

  it("RN-23: 409 al pasar de 20 materiales", async () => {
    const { cuerpo: creada } = await crear();
    for (let i = 0; i < 20; i += 1) {
      expect((await api.post(`/api/tareas/${creada.id}/material`, apunte, ana.token)).estado).toBe(201);
    }
    const { estado, cuerpo } = await api.post(`/api/tareas/${creada.id}/material`, apunte, ana.token);
    expect(estado).toBe(409);
    expect(cuerpo.error.codigo).toBe("CONFLICTO");
  });

  it("RN-23: pedidos simultáneos tampoco pasan del máximo", async () => {
    const { cuerpo: creada } = await crear();
    const respuestas = await Promise.all(
      Array.from({ length: 25 }, () => api.post(`/api/tareas/${creada.id}/material`, apunte, ana.token))
    );
    expect(respuestas.filter((r) => r.estado === 201)).toHaveLength(20);
    expect(respuestas.filter((r) => r.estado === 409)).toHaveLength(5);
    expect((await api.get(`/api/tareas/${creada.id}`, ana.token)).cuerpo.materialEstudio).toHaveLength(20);
  });

  it("RN-24: DELETE quita solo ese material y devuelve la tarea", async () => {
    const { cuerpo: creada } = await crear();
    await api.post(`/api/tareas/${creada.id}/material`, { ...apunte, titulo: "A" }, ana.token);
    const { cuerpo: conDos } = await api.post(`/api/tareas/${creada.id}/material`, { ...apunte, titulo: "B" }, ana.token);
    const { estado, cuerpo } = await api.borrar(`/api/tareas/${creada.id}/material/${conDos.materialEstudio[0].id}`, ana.token);
    expect(estado).toBe(200);
    expect(cuerpo.materialEstudio.map((m: { titulo: string }) => m.titulo)).toEqual(["B"]);
    expect(cuerpo.titulo).toBe("TP de funciones");
  });

  it("RN-07: 404 al tocar el material de la tarea de otro usuario, que queda intacto", async () => {
    const { cuerpo: creada } = await crear();
    const { cuerpo: con } = await api.post(`/api/tareas/${creada.id}/material`, apunte, ana.token);
    expect((await api.post(`/api/tareas/${creada.id}/material`, apunte, luis.token)).estado).toBe(404);
    expect((await api.borrar(`/api/tareas/${creada.id}/material/${con.materialEstudio[0].id}`, luis.token)).estado).toBe(404);
    expect((await api.get(`/api/tareas/${creada.id}`, ana.token)).cuerpo.materialEstudio).toHaveLength(1);
  });
});
