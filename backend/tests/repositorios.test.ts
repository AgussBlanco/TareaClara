import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { BaseDatos } from "../src/db/baseDatos";
import { ErrorConflicto } from "../src/dominio/errores";
import type { MaterialEstudio, Tarea, UsuarioConHash } from "../src/dominio/tipos";
import { TareaRepositorioPg } from "../src/repositorios/tareaRepositorioPg";
import { UsuarioRepositorioPg } from "../src/repositorios/usuarioRepositorioPg";
import { crearBaseMigrada } from "./ayudas/basePrueba";

const ANA: UsuarioConHash = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", nombre: "Ana", email: "ana@correo.com", contrasenaHash: "hash-ana" };
const LUIS: UsuarioConHash = { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", nombre: "Luis", email: "luis@correo.com", contrasenaHash: "hash-luis" };

let contador = 0;
function uuid(): string {
  contador += 1;
  return `00000000-0000-4000-8000-${String(contador).padStart(12, "0")}`;
}

function tarea(usuarioId: string, cambios: Partial<Tarea> = {}): Tarea {
  return {
    id: uuid(),
    usuarioId,
    titulo: "TP de funciones",
    descripcion: "Ejercicios 1 al 5",
    materia: "Matemática",
    fechaLimite: "2026-12-01",
    estado: "No completada",
    prioridad: "Alta",
    nota: null,
    materialEstudio: [],
    oculta: false,
    fechaCreacion: "2026-11-17T15:30:00.000Z",
    fechaCompletada: null,
    ...cambios,
  };
}

function material(cambios: Partial<MaterialEstudio> = {}): MaterialEstudio {
  return { id: uuid(), titulo: "Apunte", tipo: "texto", contenido: "contenido", ...cambios };
}

let db: BaseDatos;
let usuarios: UsuarioRepositorioPg;
let tareas: TareaRepositorioPg;

beforeAll(async () => {
  db = await crearBaseMigrada();
  usuarios = new UsuarioRepositorioPg(db);
  tareas = new TareaRepositorioPg(db);
});
afterAll(() => db.cerrar());
beforeEach(async () => {
  await db.consultar("TRUNCATE usuarios CASCADE");
  await usuarios.crear(ANA);
  await usuarios.crear(LUIS);
});

describe("UsuarioRepositorioPg", () => {
  it("RN-02: guarda el usuario y lo encuentra por email sin importar las mayúsculas", async () => {
    expect(await usuarios.buscarPorEmail("ANA@Correo.com")).toEqual(ANA);
  });

  it("RN-02: rechaza un email repetido con un conflicto", async () => {
    await expect(usuarios.crear({ ...LUIS, id: uuid(), email: "ANA@correo.com".toLowerCase() })).rejects.toBeInstanceOf(ErrorConflicto);
  });

  it("RN-03: buscarPorId nunca devuelve el hash de la contraseña", async () => {
    const encontrado = await usuarios.buscarPorId(ANA.id);
    expect(encontrado).toEqual({ id: ANA.id, nombre: "Ana", email: "ana@correo.com" });
    expect(encontrado).not.toHaveProperty("contrasenaHash");
  });

  it("devuelve null si el usuario no existe", async () => {
    expect(await usuarios.buscarPorEmail("nadie@correo.com")).toBeNull();
    expect(await usuarios.buscarPorId(uuid())).toBeNull();
  });
});

describe("TareaRepositorioPg: crear y leer", () => {
  it("RN-14: guarda la tarea y la devuelve con la forma que usa la API", async () => {
    const creada = await tareas.crear(tarea(ANA.id, { nota: 8.5 }));
    expect(creada).toMatchObject({
      usuarioId: ANA.id,
      titulo: "TP de funciones",
      fechaLimite: "2026-12-01",
      estado: "No completada",
      prioridad: "Alta",
      nota: 8.5,
      oculta: false,
      fechaCreacion: "2026-11-17T15:30:00.000Z",
      fechaCompletada: null,
      materialEstudio: [],
    });
    expect(typeof creada.nota).toBe("number");
  });

  it("RN-16: guarda y devuelve la fecha de completado como texto ISO", async () => {
    const creada = await tareas.crear(tarea(ANA.id, { estado: "Completada", fechaCompletada: "2026-11-20T18:00:00.000Z" }));
    expect(creada.fechaCompletada).toBe("2026-11-20T18:00:00.000Z");
  });

  it("guarda la tarea junto con su material, en orden", async () => {
    const creada = await tareas.crear(
      tarea(ANA.id, { materialEstudio: [material({ titulo: "Primero" }), material({ titulo: "Segundo" })] })
    );
    expect(creada.materialEstudio.map((m) => m.titulo)).toEqual(["Primero", "Segundo"]);
  });

  it("si el material es inválido no se guarda ni la tarea (todo o nada)", async () => {
    const mala = tarea(ANA.id, { materialEstudio: [material({ titulo: "" })] });
    await expect(tareas.crear(mala)).rejects.toThrow();
    expect(await tareas.listarPorUsuario(ANA.id)).toEqual([]);
  });

  it("RN-08: un título con SQL se guarda como texto y no se ejecuta", async () => {
    const titulo = "x'); DROP TABLE tareas; --";
    const creada = await tareas.crear(tarea(ANA.id, { titulo }));
    expect(creada.titulo).toBe(titulo);
    expect(await tareas.listarPorUsuario(ANA.id)).toHaveLength(1);
  });
});

describe("TareaRepositorioPg: aislamiento entre usuarios (RN-07)", () => {
  it("RN-07: cada usuario lista solo sus tareas", async () => {
    await tareas.crear(tarea(ANA.id, { titulo: "De Ana" }));
    await tareas.crear(tarea(LUIS.id, { titulo: "De Luis" }));
    expect((await tareas.listarPorUsuario(ANA.id)).map((t) => t.titulo)).toEqual(["De Ana"]);
    expect((await tareas.listarPorUsuario(LUIS.id)).map((t) => t.titulo)).toEqual(["De Luis"]);
  });

  it("RN-07: no se puede leer, guardar, eliminar ni tocar el material de la tarea de otro", async () => {
    const deAna = await tareas.crear(tarea(ANA.id, { materialEstudio: [material()] }));
    const materialId = deAna.materialEstudio[0]!.id;

    expect(await tareas.buscarPorId(LUIS.id, deAna.id)).toBeNull();
    expect(await tareas.guardar({ ...deAna, usuarioId: LUIS.id, titulo: "Robada" })).toBeNull();
    expect(await tareas.eliminar(LUIS.id, deAna.id)).toBe(false);
    expect(await tareas.agregarMaterial(LUIS.id, deAna.id, material(), 20)).toEqual({ resultado: "no_existe" });
    expect(await tareas.quitarMaterial(LUIS.id, deAna.id, materialId)).toBeNull();

    const intacta = await tareas.buscarPorId(ANA.id, deAna.id);
    expect(intacta?.titulo).toBe("TP de funciones");
    expect(intacta?.materialEstudio).toHaveLength(1);
  });

  it("devuelve las tareas en orden de creación", async () => {
    await tareas.crear(tarea(ANA.id, { titulo: "Segunda", fechaCreacion: "2026-11-18T10:00:00.000Z" }));
    await tareas.crear(tarea(ANA.id, { titulo: "Primera", fechaCreacion: "2026-11-17T10:00:00.000Z" }));
    expect((await tareas.listarPorUsuario(ANA.id)).map((t) => t.titulo)).toEqual(["Primera", "Segunda"]);
  });
});

describe("TareaRepositorioPg: guardar y eliminar", () => {
  it("RN-18: guarda los cambios y no toca el material", async () => {
    const creada = await tareas.crear(tarea(ANA.id, { materialEstudio: [material()] }));
    const guardada = await tareas.guardar({ ...creada, titulo: "Nuevo título", nota: 9.25, prioridad: "Baja", materialEstudio: [] });
    expect(guardada).toMatchObject({ titulo: "Nuevo título", nota: 9.25, prioridad: "Baja" });
    expect(guardada?.materialEstudio).toHaveLength(1);
  });

  it("RN-16: guarda el cambio de estado con su fecha de completado y la borra al volver", async () => {
    const creada = await tareas.crear(tarea(ANA.id));
    const completada = await tareas.guardar({ ...creada, estado: "Completada", fechaCompletada: "2026-11-20T18:00:00.000Z" });
    expect(completada?.fechaCompletada).toBe("2026-11-20T18:00:00.000Z");
    const reabierta = await tareas.guardar({ ...creada, estado: "En proceso", fechaCompletada: null });
    expect(reabierta).toMatchObject({ estado: "En proceso", fechaCompletada: null });
  });

  it("RN-19: guarda si la tarea está oculta", async () => {
    const creada = await tareas.crear(tarea(ANA.id));
    expect((await tareas.guardar({ ...creada, oculta: true }))?.oculta).toBe(true);
  });

  it("RN-20: eliminar borra la tarea y su material", async () => {
    const creada = await tareas.crear(tarea(ANA.id, { materialEstudio: [material()] }));
    expect(await tareas.eliminar(ANA.id, creada.id)).toBe(true);
    expect(await tareas.buscarPorId(ANA.id, creada.id)).toBeNull();
    expect(await db.consultar("SELECT id FROM material_estudio")).toHaveLength(0);
    expect(await tareas.eliminar(ANA.id, creada.id)).toBe(false);
  });
});

describe("TareaRepositorioPg: material de estudio", () => {
  it("RN-21: agrega material y lo devuelve dentro de la tarea", async () => {
    const creada = await tareas.crear(tarea(ANA.id));
    const resultado = await tareas.agregarMaterial(ANA.id, creada.id, material({ titulo: "Guía" }), 20);
    expect(resultado.resultado).toBe("ok");
    if (resultado.resultado === "ok") {
      expect(resultado.tarea.materialEstudio.map((m) => m.titulo)).toEqual(["Guía"]);
    }
  });

  it("RN-23: no permite pasar del máximo de material por tarea", async () => {
    const creada = await tareas.crear(tarea(ANA.id));
    for (let i = 0; i < 3; i += 1) {
      expect((await tareas.agregarMaterial(ANA.id, creada.id, material(), 3)).resultado).toBe("ok");
    }
    expect(await tareas.agregarMaterial(ANA.id, creada.id, material(), 3)).toEqual({ resultado: "limite" });
    expect((await tareas.buscarPorId(ANA.id, creada.id))?.materialEstudio).toHaveLength(3);
  });

  it("RN-24: quitar un material deja la tarea y los demás materiales", async () => {
    const creada = await tareas.crear(tarea(ANA.id, { materialEstudio: [material({ titulo: "A" }), material({ titulo: "B" })] }));
    const quitado = await tareas.quitarMaterial(ANA.id, creada.id, creada.materialEstudio[0]!.id);
    expect(quitado?.titulo).toBe("TP de funciones");
    expect(quitado?.materialEstudio.map((m) => m.titulo)).toEqual(["B"]);
  });
});
