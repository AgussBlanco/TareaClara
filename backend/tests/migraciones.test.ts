import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { BaseDatos } from "../src/db/baseDatos";
import { ejecutarMigraciones } from "../src/db/migraciones";
import { crearBaseDePrueba, crearBaseMigrada } from "./ayudas/basePrueba";

const ID_USUARIO = "11111111-1111-4111-8111-111111111111";
const ID_TAREA = "22222222-2222-4222-8222-222222222222";

async function insertarUsuario(db: BaseDatos, id = ID_USUARIO, email = "ana@correo.com"): Promise<void> {
  await db.consultar("INSERT INTO usuarios (id, nombre, email, contrasena_hash) VALUES ($1, 'Ana', $2, 'x')", [id, email]);
}

function insertarTarea(db: BaseDatos, cambios: Record<string, unknown> = {}): Promise<unknown[]> {
  const datos: Record<string, unknown> = {
    id: ID_TAREA,
    usuario_id: ID_USUARIO,
    titulo: "TP",
    descripcion: "",
    materia: "Matemática",
    fecha_limite: "2026-12-01",
    estado: "No completada",
    prioridad: "Media",
    nota: null,
    fecha_creacion: "2026-11-01T10:00:00Z",
    fecha_completada: null,
    ...cambios,
  };
  const columnas = Object.keys(datos);
  return db.consultar(
    `INSERT INTO tareas (${columnas.join(", ")}) VALUES (${columnas.map((_, i) => `$${i + 1}`).join(", ")})`,
    Object.values(datos)
  );
}

describe("migraciones", () => {
  it("RN-32: aplica la migración inicial y no la repite si se ejecuta de nuevo", async () => {
    const db = crearBaseDePrueba();
    expect(await ejecutarMigraciones(db)).toEqual(["001_inicial.sql"]);
    expect(await ejecutarMigraciones(db)).toEqual([]);
    const filas = await db.consultar("SELECT nombre FROM migraciones");
    expect(filas).toHaveLength(1);
    await db.cerrar();
  });
});

describe("restricciones de la base (última defensa)", () => {
  let db: BaseDatos;
  beforeEach(async () => {
    db = await crearBaseMigrada();
    await insertarUsuario(db);
  });
  afterEach(() => db.cerrar());

  it("RN-02: rechaza un email repetido aunque cambien las mayúsculas", async () => {
    await expect(insertarUsuario(db, "33333333-3333-4333-8333-333333333333", "ANA@correo.com")).rejects.toThrow();
  });

  it("RN-32: acepta una tarea válida", async () => {
    await insertarTarea(db);
    expect(await db.consultar("SELECT id FROM tareas")).toHaveLength(1);
  });

  it.each([
    ["título vacío (RN-08)", { titulo: "" }],
    ["título de 101 caracteres (RN-08)", { titulo: "a".repeat(101) }],
    ["materia vacía (RN-09)", { materia: "" }],
    ["descripción de 501 caracteres (RN-10)", { descripcion: "a".repeat(501) }],
    ["fecha fuera de rango (RN-11)", { fecha_limite: "1999-12-31" }],
    ["estado desconocido (RN-15)", { estado: "Terminada" }],
    ["prioridad desconocida (RN-13)", { prioridad: "Urgente" }],
    ["nota mayor a 10 (RN-17)", { nota: 10.5 }],
    ["nota negativa (RN-17)", { nota: -1 }],
    ["completada sin fecha de completado (RN-16)", { estado: "Completada" }],
    ["fecha de completado en una tarea no completada (RN-16)", { fecha_completada: "2026-11-02T10:00:00Z" }],
  ])("RN-32: la base rechaza %s", async (_nombre, cambios) => {
    await expect(insertarTarea(db, cambios)).rejects.toThrow();
  });

  it("RN-32: no permite una tarea de un usuario que no existe", async () => {
    await expect(insertarTarea(db, { usuario_id: "99999999-9999-4999-8999-999999999999" })).rejects.toThrow();
  });

  it("RN-20: al borrar una tarea se borra su material", async () => {
    await insertarTarea(db);
    await db.consultar(
      "INSERT INTO material_estudio (id, tarea_id, titulo, tipo, contenido) VALUES ($1, $2, 'Apunte', 'texto', 'hola')",
      ["44444444-4444-4444-8444-444444444444", ID_TAREA]
    );
    await db.consultar("DELETE FROM tareas WHERE id = $1", [ID_TAREA]);
    expect(await db.consultar("SELECT id FROM material_estudio")).toHaveLength(0);
  });
});

describe("transacciones", () => {
  it("si el trabajo falla a la mitad, no se guarda nada", async () => {
    const db = await crearBaseMigrada();
    await expect(
      db.transaccion(async (tx) => {
        await tx.consultar("INSERT INTO usuarios (id, nombre, email, contrasena_hash) VALUES ($1, 'Ana', 'a@a.com', 'x')", [ID_USUARIO]);
        throw new Error("falla a propósito");
      })
    ).rejects.toThrow("falla a propósito");
    expect(await db.consultar("SELECT id FROM usuarios")).toHaveLength(0);
    await db.cerrar();
  });
});
