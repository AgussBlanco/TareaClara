import { describe, expect, it } from "vitest";
import { ErrorValidacion, type DetalleValidacion } from "../src/dominio/errores";
import { TareaServicio } from "../src/servicios/tareaServicio";
import { RepositorioEnMemoria } from "./ayudas/repositorioEnMemoria";

const AHORA = new Date("2026-11-17T15:30:00.000Z");

function crearServicio() {
  const repositorio = new RepositorioEnMemoria();
  let contador = 0;
  const servicio = new TareaServicio(repositorio, {
    generarId: () => `id-${++contador}`,
    ahora: () => AHORA,
  });
  return { repositorio, servicio };
}

const valida = { titulo: "TP de funciones", materia: "Matemática", fechaLimite: "2026-12-01" };

async function detallesDe(promesa: Promise<unknown>): Promise<DetalleValidacion[]> {
  try {
    await promesa;
  } catch (error) {
    if (error instanceof ErrorValidacion) {
      return error.detalles;
    }
    throw error;
  }
  throw new Error("Se esperaba un ErrorValidacion y no hubo error");
}

describe("TareaServicio.crearTarea: casos correctos", () => {
  it("crea la tarea con los valores iniciales que decide el servidor", async () => {
    const { servicio, repositorio } = crearServicio();
    const tarea = await servicio.crearTarea("ana", { ...valida, descripcion: "Ejercicios 1 al 5", prioridad: "Alta" });

    expect(tarea).toEqual({
      id: "id-1",
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
      fechaCreacion: "2026-11-17T15:30:00.000Z",
      fechaCompletada: null,
    });
    expect(repositorio.tareas).toHaveLength(1);
  });

  it("usa prioridad Media y descripción vacía cuando no se envían", async () => {
    const { servicio } = crearServicio();
    const tarea = await servicio.crearTarea("ana", valida);
    expect(tarea.prioridad).toBe("Media");
    expect(tarea.descripcion).toBe("");
  });

  it("recorta los espacios sobrantes de los textos", async () => {
    const { servicio } = crearServicio();
    const tarea = await servicio.crearTarea("ana", { ...valida, titulo: "  TP  ", materia: " Lengua " });
    expect(tarea.titulo).toBe("TP");
    expect(tarea.materia).toBe("Lengua");
  });

  it("acepta una fecha límite en el pasado (la tarea figurará como vencida en la interfaz)", async () => {
    const { servicio } = crearServicio();
    const tarea = await servicio.crearTarea("ana", { ...valida, fechaLimite: "2020-01-31" });
    expect(tarea.fechaLimite).toBe("2020-01-31");
  });

  it("acepta el 29 de febrero de un año bisiesto", async () => {
    const { servicio } = crearServicio();
    await expect(servicio.crearTarea("ana", { ...valida, fechaLimite: "2028-02-29" })).resolves.toBeTruthy();
  });
});

describe("TareaServicio.crearTarea: seguridad", () => {
  it("ignora los campos que el cliente no debería decidir (dueño, id, estado, nota...)", async () => {
    const { servicio } = crearServicio();
    const tarea = await servicio.crearTarea("ana", {
      ...valida,
      usuarioId: "luis",
      id: "id-falso",
      estado: "Completada",
      nota: 10,
      oculta: true,
      fechaCompletada: "2026-01-01T00:00:00.000Z",
      materialEstudio: [{ id: "x" }],
    });
    expect(tarea.usuarioId).toBe("ana");
    expect(tarea.id).toBe("id-1");
    expect(tarea.estado).toBe("No completada");
    expect(tarea.nota).toBeNull();
    expect(tarea.oculta).toBe(false);
    expect(tarea.fechaCompletada).toBeNull();
    expect(tarea.materialEstudio).toEqual([]);
  });
});

describe("TareaServicio.crearTarea: datos inválidos", () => {
  it.each([
    ["null", null],
    ["undefined (sin cuerpo)", undefined],
    ["un texto", "hola"],
    ["un arreglo", [valida]],
    ["un número", 42],
  ])("rechaza un cuerpo que es %s", async (_nombre, cuerpo) => {
    const { servicio } = crearServicio();
    expect((await detallesDe(servicio.crearTarea("ana", cuerpo))).map((d) => d.campo)).toEqual(["cuerpo"]);
  });

  it("rechaza título vacío, solo espacios, ausente, de otro tipo o demasiado largo", async () => {
    const { servicio } = crearServicio();
    for (const titulo of ["", "   ", undefined, 123, "x".repeat(101)]) {
      const detalles = await detallesDe(servicio.crearTarea("ana", { ...valida, titulo }));
      expect(detalles.map((d) => d.campo)).toEqual(["titulo"]);
    }
  });

  it("acepta un título de exactamente 100 caracteres", async () => {
    const { servicio } = crearServicio();
    await expect(servicio.crearTarea("ana", { ...valida, titulo: "x".repeat(100) })).resolves.toBeTruthy();
  });

  it("rechaza materia ausente y descripción demasiado larga", async () => {
    const { servicio } = crearServicio();
    const detalles = await detallesDe(
      servicio.crearTarea("ana", { titulo: "TP", fechaLimite: "2026-12-01", descripcion: "x".repeat(501) })
    );
    expect(detalles.map((d) => d.campo).sort()).toEqual(["descripcion", "materia"]);
  });

  it.each(["", "mañana", "2026-02-31", "2026-13-01", "2026-1-5", "01/12/2026", "2027-02-29"])(
    "rechaza la fecha límite '%s'",
    async (fechaLimite) => {
      const { servicio } = crearServicio();
      expect((await detallesDe(servicio.crearTarea("ana", { ...valida, fechaLimite }))).map((d) => d.campo)).toEqual([
        "fechaLimite",
      ]);
    }
  );

  it("rechaza fecha límite ausente o que no es texto", async () => {
    const { servicio } = crearServicio();
    for (const fechaLimite of [undefined, 20261201, null]) {
      expect((await detallesDe(servicio.crearTarea("ana", { ...valida, fechaLimite }))).map((d) => d.campo)).toEqual([
        "fechaLimite",
      ]);
    }
  });

  it("rechaza una prioridad que no es Baja, Media o Alta", async () => {
    const { servicio } = crearServicio();
    for (const prioridad of ["Urgente", "alta", 1, null]) {
      expect((await detallesDe(servicio.crearTarea("ana", { ...valida, prioridad }))).map((d) => d.campo)).toEqual([
        "prioridad",
      ]);
    }
  });

  it("informa todos los errores juntos, no solo el primero", async () => {
    const { servicio } = crearServicio();
    const detalles = await detallesDe(servicio.crearTarea("ana", { titulo: "", fechaLimite: "x", prioridad: "Ya" }));
    expect(detalles.map((d) => d.campo).sort()).toEqual(["fechaLimite", "materia", "prioridad", "titulo"]);
  });

  it("no guarda nada cuando los datos son inválidos", async () => {
    const { servicio, repositorio } = crearServicio();
    await detallesDe(servicio.crearTarea("ana", { titulo: "" }));
    expect(repositorio.tareas).toHaveLength(0);
  });
});

describe("TareaServicio.listarTareas", () => {
  it("devuelve solo las tareas del usuario", async () => {
    const { servicio } = crearServicio();
    await servicio.crearTarea("ana", { ...valida, titulo: "De Ana" });
    await servicio.crearTarea("luis", { ...valida, titulo: "De Luis" });
    expect((await servicio.listarTareas("ana")).map((t) => t.titulo)).toEqual(["De Ana"]);
    expect(await servicio.listarTareas("nadie")).toEqual([]);
  });
});
