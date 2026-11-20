import { describe, expect, it } from "vitest";
import { ErrorConflicto, ErrorNoEncontrado, ErrorValidacion, type DetalleValidacion } from "../src/dominio/errores";
import { TareaServicio } from "../src/servicios/tareaServicio";
import { RepositorioEnMemoria } from "./ayudas/repositorioEnMemoria";

const AHORA = new Date("2026-11-17T15:30:00.000Z");
const ANA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const LUIS = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function crearServicio() {
  const repositorio = new RepositorioEnMemoria();
  let contador = 0;
  const servicio = new TareaServicio(repositorio, {
    generarId: () => `00000000-0000-4000-8000-${String(++contador).padStart(12, "0")}`,
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

async function camposInvalidos(promesa: Promise<unknown>): Promise<string[]> {
  return (await detallesDe(promesa)).map((d) => d.campo).sort();
}

describe("TareaServicio.crearTarea: casos correctos", () => {
  it("RN-14: crea la tarea con los valores iniciales que decide el servidor", async () => {
    const { servicio, repositorio } = crearServicio();
    const tarea = await servicio.crearTarea(ANA, { ...valida, descripcion: "Ejercicios 1 al 5", prioridad: "Alta" });
    expect(tarea).toEqual({
      id: "00000000-0000-4000-8000-000000000001",
      usuarioId: ANA,
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

  it("RN-13 y RN-10: usa prioridad Media y descripción vacía cuando no se envían", async () => {
    const tarea = await crearServicio().servicio.crearTarea(ANA, valida);
    expect(tarea.prioridad).toBe("Media");
    expect(tarea.descripcion).toBe("");
  });

  it("RN-08 y RN-09: recorta los espacios sobrantes de los textos", async () => {
    const tarea = await crearServicio().servicio.crearTarea(ANA, { ...valida, titulo: "  TP  ", materia: " Lengua " });
    expect(tarea.titulo).toBe("TP");
    expect(tarea.materia).toBe("Lengua");
  });

  it("RN-12: acepta una fecha límite en el pasado (figurará como vencida)", async () => {
    const tarea = await crearServicio().servicio.crearTarea(ANA, { ...valida, fechaLimite: "2020-01-31" });
    expect(tarea.fechaLimite).toBe("2020-01-31");
  });

  it("RN-11: acepta el 29 de febrero de un año bisiesto y los años 2000 y 2100", async () => {
    const { servicio } = crearServicio();
    for (const fechaLimite of ["2028-02-29", "2000-01-01", "2100-12-31"]) {
      await expect(servicio.crearTarea(ANA, { ...valida, fechaLimite })).resolves.toBeTruthy();
    }
  });

  it("RN-17: acepta una nota al crear", async () => {
    const tarea = await crearServicio().servicio.crearTarea(ANA, { ...valida, nota: 7.25 });
    expect(tarea.nota).toBe(7.25);
  });
});

describe("TareaServicio.crearTarea: seguridad", () => {
  it("RN-14: ignora los campos que el cliente no debería decidir (dueño, id, estado, oculta...)", async () => {
    const tarea = await crearServicio().servicio.crearTarea(ANA, {
      ...valida,
      usuarioId: LUIS,
      id: "id-falso",
      estado: "Completada",
      oculta: true,
      fechaCompletada: "2026-01-01T00:00:00.000Z",
      materialEstudio: [{ id: "x" }],
    });
    expect(tarea.usuarioId).toBe(ANA);
    expect(tarea.id).toBe("00000000-0000-4000-8000-000000000001");
    expect(tarea.estado).toBe("No completada");
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
    expect(await camposInvalidos(crearServicio().servicio.crearTarea(ANA, cuerpo))).toEqual(["cuerpo"]);
  });

  it("RN-08: rechaza título vacío, solo espacios, ausente, de otro tipo o de más de 100 caracteres", async () => {
    const { servicio } = crearServicio();
    for (const titulo of ["", "   ", undefined, 123, "x".repeat(101)]) {
      expect(await camposInvalidos(servicio.crearTarea(ANA, { ...valida, titulo }))).toEqual(["titulo"]);
    }
  });

  it("RN-08: acepta un título de exactamente 100 caracteres", async () => {
    await expect(crearServicio().servicio.crearTarea(ANA, { ...valida, titulo: "x".repeat(100) })).resolves.toBeTruthy();
  });

  it("RN-09 y RN-10: rechaza materia ausente, materia de 51 caracteres y descripción de 501", async () => {
    const { servicio } = crearServicio();
    expect(
      await camposInvalidos(servicio.crearTarea(ANA, { titulo: "TP", fechaLimite: "2026-12-01", descripcion: "x".repeat(501) }))
    ).toEqual(["descripcion", "materia"]);
    expect(await camposInvalidos(servicio.crearTarea(ANA, { ...valida, materia: "m".repeat(51) }))).toEqual(["materia"]);
  });

  it.each(["", "mañana", "2026-02-31", "2026-13-01", "2026-1-5", "01/12/2026", "2027-02-29", "1999-12-31", "2101-01-01", "0050-01-01"])(
    "RN-11: rechaza la fecha límite '%s'",
    async (fechaLimite) => {
      expect(await camposInvalidos(crearServicio().servicio.crearTarea(ANA, { ...valida, fechaLimite }))).toEqual(["fechaLimite"]);
    }
  );

  it("RN-11: rechaza fecha límite ausente o que no es texto", async () => {
    const { servicio } = crearServicio();
    for (const fechaLimite of [undefined, 20261201, null]) {
      expect(await camposInvalidos(servicio.crearTarea(ANA, { ...valida, fechaLimite }))).toEqual(["fechaLimite"]);
    }
  });

  it("RN-13: rechaza una prioridad que no es Baja, Media o Alta", async () => {
    const { servicio } = crearServicio();
    for (const prioridad of ["Urgente", "alta", 1, null]) {
      expect(await camposInvalidos(servicio.crearTarea(ANA, { ...valida, prioridad }))).toEqual(["prioridad"]);
    }
  });

  it.each([-0.01, 10.01, 11, 7.123, "8", NaN, Infinity, true, {}])("RN-17: rechaza la nota %j", async (nota) => {
    expect(await camposInvalidos(crearServicio().servicio.crearTarea(ANA, { ...valida, nota }))).toEqual(["nota"]);
  });

  it.each([0, 10, 5.5, 9.99, null])("RN-17: acepta la nota %j", async (nota) => {
    const tarea = await crearServicio().servicio.crearTarea(ANA, { ...valida, nota });
    expect(tarea.nota).toBe(nota);
  });

  it("informa todos los errores juntos, no solo el primero", async () => {
    expect(await camposInvalidos(crearServicio().servicio.crearTarea(ANA, { titulo: "", fechaLimite: "x", prioridad: "Ya" }))).toEqual([
      "fechaLimite",
      "materia",
      "prioridad",
      "titulo",
    ]);
  });

  it("no guarda nada cuando los datos son inválidos", async () => {
    const { servicio, repositorio } = crearServicio();
    await detallesDe(servicio.crearTarea(ANA, { titulo: "" }));
    expect(repositorio.tareas).toHaveLength(0);
  });
});

describe("TareaServicio.listarTareas y obtenerTarea", () => {
  it("RN-07: cada usuario lista solo sus tareas", async () => {
    const { servicio } = crearServicio();
    await servicio.crearTarea(ANA, { ...valida, titulo: "De Ana" });
    await servicio.crearTarea(LUIS, { ...valida, titulo: "De Luis" });
    expect((await servicio.listarTareas(ANA)).map((t) => t.titulo)).toEqual(["De Ana"]);
    expect(await servicio.listarTareas("nadie")).toEqual([]);
  });

  it("devuelve la tarea pedida", async () => {
    const { servicio } = crearServicio();
    const creada = await servicio.crearTarea(ANA, valida);
    expect(await servicio.obtenerTarea(ANA, creada.id)).toEqual(creada);
  });

  it("RN-07: la tarea de otro usuario, una que no existe y un id mal formado dan el mismo error", async () => {
    const { servicio } = crearServicio();
    const deAna = await servicio.crearTarea(ANA, valida);
    for (const id of [deAna.id, "00000000-0000-4000-8000-0000000000ff", "no-es-un-uuid", ""]) {
      await expect(servicio.obtenerTarea(LUIS, id)).rejects.toBeInstanceOf(ErrorNoEncontrado);
    }
  });
});

describe("TareaServicio.editarTarea", () => {
  const nuevos = { titulo: "Nuevo título", materia: "Lengua", fechaLimite: "2027-03-15", prioridad: "Baja", descripcion: "otra", nota: 9 };

  it("RN-18: reemplaza los datos editables", async () => {
    const { servicio } = crearServicio();
    const creada = await servicio.crearTarea(ANA, valida);
    const editada = await servicio.editarTarea(ANA, creada.id, nuevos);
    expect(editada).toMatchObject(nuevos);
  });

  it("RN-18: no cambia el estado, el dueño, el material ni la fecha de creación aunque se envíen", async () => {
    const { servicio } = crearServicio();
    const creada = await servicio.crearTarea(ANA, valida);
    const editada = await servicio.editarTarea(ANA, creada.id, { ...nuevos, estado: "Completada", usuarioId: LUIS, oculta: true, fechaCreacion: "2000-01-01T00:00:00.000Z" });
    expect(editada).toMatchObject({
      estado: "No completada",
      usuarioId: ANA,
      oculta: false,
      fechaCreacion: creada.fechaCreacion,
      id: creada.id,
    });
  });

  it("RN-18: la prioridad es obligatoria al editar; sin descripción ni nota quedan vacías", async () => {
    const { servicio } = crearServicio();
    const creada = await servicio.crearTarea(ANA, { ...valida, descripcion: "algo", nota: 6 });
    expect(await camposInvalidos(servicio.editarTarea(ANA, creada.id, valida))).toEqual(["prioridad"]);
    const editada = await servicio.editarTarea(ANA, creada.id, { ...valida, prioridad: "Alta" });
    expect(editada).toMatchObject({ descripcion: "", nota: null });
  });

  it("RN-17: se puede quitar la nota", async () => {
    const { servicio } = crearServicio();
    const creada = await servicio.crearTarea(ANA, { ...valida, nota: 6 });
    expect((await servicio.editarTarea(ANA, creada.id, { ...valida, prioridad: "Media", nota: null })).nota).toBeNull();
  });

  it("RN-07: no se puede editar la tarea de otro usuario", async () => {
    const { servicio } = crearServicio();
    const deAna = await servicio.crearTarea(ANA, valida);
    await expect(servicio.editarTarea(LUIS, deAna.id, nuevos)).rejects.toBeInstanceOf(ErrorNoEncontrado);
    expect((await servicio.obtenerTarea(ANA, deAna.id)).titulo).toBe("TP de funciones");
  });

  it("RN-08 a RN-11: valida los datos nuevos y no guarda nada si son inválidos", async () => {
    const { servicio } = crearServicio();
    const creada = await servicio.crearTarea(ANA, valida);
    expect(await camposInvalidos(servicio.editarTarea(ANA, creada.id, { ...nuevos, titulo: "", fechaLimite: "2026-02-31" }))).toEqual(["fechaLimite", "titulo"]);
    expect((await servicio.obtenerTarea(ANA, creada.id)).titulo).toBe("TP de funciones");
  });
});

describe("TareaServicio.eliminarTarea", () => {
  it("RN-20: elimina la tarea", async () => {
    const { servicio, repositorio } = crearServicio();
    const creada = await servicio.crearTarea(ANA, valida);
    await servicio.eliminarTarea(ANA, creada.id);
    expect(repositorio.tareas).toHaveLength(0);
  });

  it("RN-07: no se puede eliminar la tarea de otro usuario ni una que no existe", async () => {
    const { servicio, repositorio } = crearServicio();
    const deAna = await servicio.crearTarea(ANA, valida);
    await expect(servicio.eliminarTarea(LUIS, deAna.id)).rejects.toBeInstanceOf(ErrorNoEncontrado);
    await expect(servicio.eliminarTarea(ANA, "no-es-un-uuid")).rejects.toBeInstanceOf(ErrorNoEncontrado);
    expect(repositorio.tareas).toHaveLength(1);
  });
});

describe("TareaServicio.cambiarEstado", () => {
  it("RN-15: se puede pasar de cualquier estado a cualquier otro", async () => {
    const { servicio } = crearServicio();
    const { id } = await servicio.crearTarea(ANA, valida);
    for (const estado of ["En proceso", "Completada", "No completada", "Completada", "En proceso"]) {
      expect((await servicio.cambiarEstado(ANA, id, { estado })).estado).toBe(estado);
    }
  });

  it("RN-16: al completar guarda la fecha y hora de completado", async () => {
    const { servicio } = crearServicio();
    const { id } = await servicio.crearTarea(ANA, valida);
    expect((await servicio.cambiarEstado(ANA, id, { estado: "Completada" })).fechaCompletada).toBe("2026-11-17T15:30:00.000Z");
  });

  it("RN-16: al volver a otro estado la fecha de completado se borra", async () => {
    const { servicio } = crearServicio();
    const { id } = await servicio.crearTarea(ANA, valida);
    await servicio.cambiarEstado(ANA, id, { estado: "Completada" });
    expect((await servicio.cambiarEstado(ANA, id, { estado: "En proceso" })).fechaCompletada).toBeNull();
  });

  it("RN-16: marcar el estado que ya tiene no cambia nada, ni la fecha de completado", async () => {
    const repositorio = new RepositorioEnMemoria();
    let hora = new Date("2026-11-17T15:30:00.000Z");
    const servicio = new TareaServicio(repositorio, { generarId: () => "00000000-0000-4000-8000-000000000001", ahora: () => hora });
    const { id } = await servicio.crearTarea(ANA, valida);
    const primera = await servicio.cambiarEstado(ANA, id, { estado: "Completada" });
    hora = new Date("2026-11-20T10:00:00.000Z");
    const segunda = await servicio.cambiarEstado(ANA, id, { estado: "Completada" });
    expect(segunda.fechaCompletada).toBe(primera.fechaCompletada);
  });

  it("RN-15: rechaza un estado que no existe, o que no es texto", async () => {
    const { servicio } = crearServicio();
    const { id } = await servicio.crearTarea(ANA, valida);
    for (const estado of ["Terminada", "completada", "", 1, null, undefined]) {
      expect(await camposInvalidos(servicio.cambiarEstado(ANA, id, { estado }))).toEqual(["estado"]);
    }
  });

  it("RN-07: no se puede cambiar el estado de la tarea de otro usuario", async () => {
    const { servicio } = crearServicio();
    const { id } = await servicio.crearTarea(ANA, valida);
    await expect(servicio.cambiarEstado(LUIS, id, { estado: "Completada" })).rejects.toBeInstanceOf(ErrorNoEncontrado);
  });
});

describe("TareaServicio.cambiarOculta", () => {
  it("RN-19: oculta y vuelve a mostrar sin perder ningún dato", async () => {
    const { servicio } = crearServicio();
    const creada = await servicio.crearTarea(ANA, { ...valida, nota: 8, descripcion: "d" });
    const oculta = await servicio.cambiarOculta(ANA, creada.id, { oculta: true });
    expect(oculta).toEqual({ ...creada, oculta: true });
    expect(await servicio.cambiarOculta(ANA, creada.id, { oculta: false })).toEqual(creada);
  });

  it("RN-19: rechaza valores que no son true o false", async () => {
    const { servicio } = crearServicio();
    const { id } = await servicio.crearTarea(ANA, valida);
    for (const oculta of ["true", 1, null, undefined]) {
      expect(await camposInvalidos(servicio.cambiarOculta(ANA, id, { oculta }))).toEqual(["oculta"]);
    }
  });
});

describe("TareaServicio: material de estudio", () => {
  const apunte = { titulo: "Resumen", tipo: "texto", contenido: "Las funciones lineales..." };

  it("RN-21: agrega un apunte y un enlace", async () => {
    const { servicio } = crearServicio();
    const { id } = await servicio.crearTarea(ANA, valida);
    await servicio.agregarMaterial(ANA, id, apunte);
    const conAmbos = await servicio.agregarMaterial(ANA, id, { titulo: "Video", tipo: "link", contenido: "https://youtu.be/abc" });
    expect(conAmbos.materialEstudio.map((m) => [m.titulo, m.tipo])).toEqual([["Resumen", "texto"], ["Video", "link"]]);
    expect(conAmbos.materialEstudio[0]?.id).toMatch(/^00000000-0000-4000-8000-/);
  });

  it("RN-21: recorta espacios y rechaza título o contenido vacío, o que se pasen de largo", async () => {
    const { servicio } = crearServicio();
    const { id } = await servicio.crearTarea(ANA, valida);
    const guardado = await servicio.agregarMaterial(ANA, id, { ...apunte, titulo: "  Resumen  " });
    expect(guardado.materialEstudio[0]?.titulo).toBe("Resumen");
    expect(await camposInvalidos(servicio.agregarMaterial(ANA, id, { ...apunte, titulo: "" }))).toEqual(["titulo"]);
    expect(await camposInvalidos(servicio.agregarMaterial(ANA, id, { ...apunte, titulo: "t".repeat(61) }))).toEqual(["titulo"]);
    expect(await camposInvalidos(servicio.agregarMaterial(ANA, id, { ...apunte, contenido: " " }))).toEqual(["contenido"]);
    expect(await camposInvalidos(servicio.agregarMaterial(ANA, id, { ...apunte, contenido: "c".repeat(1001) }))).toEqual(["contenido"]);
    await expect(servicio.agregarMaterial(ANA, id, { ...apunte, titulo: "t".repeat(60), contenido: "c".repeat(1000) })).resolves.toBeTruthy();
  });

  it("RN-21: rechaza un tipo que no es link ni texto", async () => {
    const { servicio } = crearServicio();
    const { id } = await servicio.crearTarea(ANA, valida);
    for (const tipo of ["video", "", undefined, 1]) {
      expect(await camposInvalidos(servicio.agregarMaterial(ANA, id, { ...apunte, tipo }))).toEqual(["tipo"]);
    }
  });

  it.each(["ftp://sitio.com/a", "javascript:alert(1)", "www.sitio.com", "sitio.com", "https://", "data:text/html,hola"])(
    "RN-22: rechaza el enlace '%s'",
    async (contenido) => {
      const { servicio } = crearServicio();
      const { id } = await servicio.crearTarea(ANA, valida);
      expect(await camposInvalidos(servicio.agregarMaterial(ANA, id, { titulo: "x", tipo: "link", contenido }))).toEqual(["contenido"]);
    }
  );

  it("RN-22: un apunte puede empezar con cualquier texto (solo los enlaces se revisan)", async () => {
    const { servicio } = crearServicio();
    const { id } = await servicio.crearTarea(ANA, valida);
    await expect(servicio.agregarMaterial(ANA, id, { titulo: "x", tipo: "texto", contenido: "javascript:alert(1)" })).resolves.toBeTruthy();
  });

  it("RN-23: no permite más de 20 materiales por tarea", async () => {
    const { servicio } = crearServicio();
    const { id } = await servicio.crearTarea(ANA, valida);
    for (let i = 0; i < 20; i += 1) {
      await servicio.agregarMaterial(ANA, id, apunte);
    }
    await expect(servicio.agregarMaterial(ANA, id, apunte)).rejects.toBeInstanceOf(ErrorConflicto);
    expect((await servicio.obtenerTarea(ANA, id)).materialEstudio).toHaveLength(20);
  });

  it("RN-24: quita un material y deja los otros", async () => {
    const { servicio } = crearServicio();
    const { id } = await servicio.crearTarea(ANA, valida);
    await servicio.agregarMaterial(ANA, id, { ...apunte, titulo: "A" });
    const dos = await servicio.agregarMaterial(ANA, id, { ...apunte, titulo: "B" });
    const quedo = await servicio.quitarMaterial(ANA, id, dos.materialEstudio[0]!.id);
    expect(quedo.materialEstudio.map((m) => m.titulo)).toEqual(["B"]);
    expect(quedo.titulo).toBe("TP de funciones");
  });

  it("RN-07: no se puede agregar ni quitar material en la tarea de otro usuario", async () => {
    const { servicio } = crearServicio();
    const { id } = await servicio.crearTarea(ANA, valida);
    const con = await servicio.agregarMaterial(ANA, id, apunte);
    await expect(servicio.agregarMaterial(LUIS, id, apunte)).rejects.toBeInstanceOf(ErrorNoEncontrado);
    await expect(servicio.quitarMaterial(LUIS, id, con.materialEstudio[0]!.id)).rejects.toBeInstanceOf(ErrorNoEncontrado);
    expect((await servicio.obtenerTarea(ANA, id)).materialEstudio).toHaveLength(1);
  });

  it("devuelve 'no encontrado' si el id de la tarea o del material no tiene forma de UUID", async () => {
    const { servicio } = crearServicio();
    const { id } = await servicio.crearTarea(ANA, valida);
    await expect(servicio.agregarMaterial(ANA, "xx", apunte)).rejects.toBeInstanceOf(ErrorNoEncontrado);
    await expect(servicio.quitarMaterial(ANA, id, "xx")).rejects.toBeInstanceOf(ErrorNoEncontrado);
  });
});
