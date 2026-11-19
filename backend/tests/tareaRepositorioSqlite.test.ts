import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { abrirBaseDeDatos, type BaseDeDatos } from "../src/db/conexion";
import type { Tarea } from "../src/dominio/tipos";
import { TareaRepositorioSqlite } from "../src/repositorios/tareaRepositorioSqlite";
import { UsuarioRepositorioSqlite } from "../src/repositorios/usuarioRepositorioSqlite";

let db: BaseDeDatos;
let repositorio: TareaRepositorioSqlite;

function tarea(id: string, usuarioId: string, extra: Partial<Tarea> = {}): Tarea {
  return {
    id,
    usuarioId,
    titulo: `Tarea ${id}`,
    descripcion: "",
    materia: "Lengua",
    fechaLimite: "2026-12-01",
    estado: "No completada",
    prioridad: "Media",
    nota: null,
    materialEstudio: [],
    oculta: false,
    fechaCreacion: `2026-11-17T10:00:0${id.length}.000Z`,
    fechaCompletada: null,
    ...extra,
  };
}

beforeEach(async () => {
  db = abrirBaseDeDatos(":memory:");
  const usuarios = new UsuarioRepositorioSqlite(db);
  await usuarios.crear({ id: "ana", nombre: "Ana", email: "ana@ejemplo.com", contrasenaHash: "!" });
  await usuarios.crear({ id: "luis", nombre: "Luis", email: "luis@ejemplo.com", contrasenaHash: "!" });
  repositorio = new TareaRepositorioSqlite(db);
});

afterEach(() => {
  db.close();
});

describe("TareaRepositorioSqlite", () => {
  it("guarda una tarea y la devuelve igual al listarla", async () => {
    const original = tarea("a", "ana", { nota: 8.5, oculta: true, estado: "Completada", fechaCompletada: "2026-11-18T09:00:00.000Z" });
    await repositorio.crear(original);
    expect(await repositorio.listarPorUsuario("ana")).toEqual([original]);
  });

  it("guarda y devuelve el material de estudio junto con la tarea", async () => {
    const conMaterial = tarea("a", "ana", {
      materialEstudio: [
        { id: "m1", titulo: "Guía", tipo: "link", contenido: "https://ejemplo.com" },
        { id: "m2", titulo: "Resumen", tipo: "texto", contenido: "La derivada es..." },
      ],
    });
    await repositorio.crear(conMaterial);
    expect(await repositorio.listarPorUsuario("ana")).toEqual([conMaterial]);
  });

  it("lista solo las tareas del usuario pedido", async () => {
    await repositorio.crear(tarea("a", "ana"));
    await repositorio.crear(tarea("bb", "luis"));
    expect((await repositorio.listarPorUsuario("ana")).map((t) => t.id)).toEqual(["a"]);
    expect((await repositorio.listarPorUsuario("luis")).map((t) => t.id)).toEqual(["bb"]);
    expect(await repositorio.listarPorUsuario("nadie")).toEqual([]);
  });

  it("guarda tal cual un título con comillas y SQL (las consultas usan parámetros)", async () => {
    const peligrosa = tarea("a", "ana", { titulo: "'); DROP TABLE tareas; --" });
    await repositorio.crear(peligrosa);
    expect((await repositorio.listarPorUsuario("ana"))[0]?.titulo).toBe("'); DROP TABLE tareas; --");
  });

  it("la base rechaza una tarea de un usuario que no existe (clave foránea)", async () => {
    await expect(repositorio.crear(tarea("a", "fantasma"))).rejects.toThrow(/FOREIGN KEY/);
  });

  it("la base rechaza valores fuera de las reglas aunque el servicio los dejara pasar (CHECK)", async () => {
    await expect(repositorio.crear(tarea("a", "ana", { nota: 11 }))).rejects.toThrow(/CHECK/);
    await expect(repositorio.crear(tarea("b", "ana", { prioridad: "Urgente" as never }))).rejects.toThrow(/CHECK/);
    await expect(repositorio.crear(tarea("c", "ana", { estado: "Hecha" as never }))).rejects.toThrow(/CHECK/);
  });

  it("no deja una tarea a medias: si falla el material, no se guarda la tarea (transacción)", async () => {
    const mala = tarea("a", "ana", {
      materialEstudio: [{ id: "m1", titulo: "X", tipo: "video" as never, contenido: "y" }],
    });
    await expect(repositorio.crear(mala)).rejects.toThrow(/CHECK/);
    expect(await repositorio.listarPorUsuario("ana")).toEqual([]);
  });

  it("no permite repetir el id de una tarea", async () => {
    await repositorio.crear(tarea("a", "ana"));
    await expect(repositorio.crear(tarea("a", "ana"))).rejects.toThrow(/UNIQUE|PRIMARY/);
  });
});
