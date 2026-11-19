import { describe, expect, it } from "vitest";
import type { DatosTarea, Tarea } from "../types";
import {
  agregarMaterial,
  alternarOculta,
  cambiarEstado,
  crearTarea,
  editarTarea,
  materiasDe,
  ordenarTareas,
  quitarMaterial,
} from "./tareas";

const datos: DatosTarea = {
  titulo: "TP de funciones",
  descripcion: "Ejercicios 1 al 5",
  materia: "Matemática",
  fechaLimite: "2026-10-10",
  prioridad: "Media",
  nota: null,
};

const ahora = new Date("2026-10-02T21:30:00.000Z");

function tarea(titulo: string, extra: Partial<Tarea> = {}): Tarea {
  return { ...crearTarea("u1", { ...datos, titulo }, ahora), ...extra };
}

describe("crearTarea", () => {
  it("arranca 'No completada', visible, sin material y sin fecha de completado", () => {
    const t = crearTarea("u1", datos, ahora);
    expect(t.usuarioId).toBe("u1");
    expect(t.estado).toBe("No completada");
    expect(t.oculta).toBe(false);
    expect(t.materialEstudio).toEqual([]);
    expect(t.fechaCompletada).toBeNull();
    expect(t.fechaCreacion).toBe(ahora.toISOString());
    expect(t.titulo).toBe("TP de funciones");
  });

  it("genera un id distinto para cada tarea", () => {
    expect(crearTarea("u1", datos).id).not.toBe(crearTarea("u1", datos).id);
  });
});

describe("cambiarEstado", () => {
  it("al completar guarda la fecha de completado", () => {
    const t = cambiarEstado(tarea("A"), "Completada", ahora);
    expect(t.estado).toBe("Completada");
    expect(t.fechaCompletada).toBe(ahora.toISOString());
  });

  it("al salir de 'Completada' borra la fecha de completado", () => {
    const completada = cambiarEstado(tarea("A"), "Completada", ahora);
    const reabierta = cambiarEstado(completada, "En proceso", ahora);
    expect(reabierta.estado).toBe("En proceso");
    expect(reabierta.fechaCompletada).toBeNull();
  });

  it("si el estado no cambia devuelve la misma tarea y conserva la fecha original", () => {
    const completada = cambiarEstado(tarea("A"), "Completada", ahora);
    expect(cambiarEstado(completada, "Completada", new Date("2030-01-01"))).toBe(completada);
  });

  it("no muta la tarea original", () => {
    const original = tarea("A");
    cambiarEstado(original, "Completada", ahora);
    expect(original.estado).toBe("No completada");
  });
});

describe("editar, ocultar y material", () => {
  it("editarTarea cambia los datos pero conserva identidad, estado, material y visibilidad", () => {
    const base = alternarOculta(agregarMaterial(cambiarEstado(tarea("A"), "En proceso"), {
      titulo: "Apunte", tipo: "texto", contenido: "x",
    }));
    const editada = editarTarea(base, { ...datos, titulo: "Otro título", nota: 8.5 });
    expect(editada.titulo).toBe("Otro título");
    expect(editada.nota).toBe(8.5);
    expect(editada.id).toBe(base.id);
    expect(editada.usuarioId).toBe(base.usuarioId);
    expect(editada.estado).toBe("En proceso");
    expect(editada.oculta).toBe(true);
    expect(editada.materialEstudio).toHaveLength(1);
  });

  it("alternarOculta oculta y vuelve a mostrar", () => {
    const oculta = alternarOculta(tarea("A"));
    expect(oculta.oculta).toBe(true);
    expect(alternarOculta(oculta).oculta).toBe(false);
  });

  it("agrega material con id propio y lo quita por id", () => {
    const conMaterial = agregarMaterial(tarea("A"), { titulo: "Guía", tipo: "link", contenido: "https://ejemplo.com" });
    const [material] = conMaterial.materialEstudio;
    expect(material?.id).toBeTruthy();
    expect(quitarMaterial(conMaterial, material?.id ?? "").materialEstudio).toEqual([]);
    expect(quitarMaterial(conMaterial, "no-existe").materialEstudio).toHaveLength(1);
  });
});

describe("ordenarTareas", () => {
  it("pendientes por fecha, luego prioridad; sin fecha válida después; completadas al final", () => {
    const lista = [
      tarea("E", { estado: "Completada", fechaLimite: "2026-09-01", prioridad: "Alta" }),
      tarea("D", { fechaLimite: "", prioridad: "Alta" }),
      tarea("A", { fechaLimite: "2026-10-05", prioridad: "Baja" }),
      tarea("B", { fechaLimite: "2026-10-05", prioridad: "Alta" }),
      tarea("C", { fechaLimite: "2026-10-01", prioridad: "Media" }),
    ];
    expect(ordenarTareas(lista).map((t) => t.titulo)).toEqual(["C", "B", "A", "D", "E"]);
  });

  it("no modifica el arreglo recibido", () => {
    const lista = [tarea("B", { fechaLimite: "2026-10-09" }), tarea("A", { fechaLimite: "2026-10-01" })];
    ordenarTareas(lista);
    expect(lista.map((t) => t.titulo)).toEqual(["B", "A"]);
  });
});

describe("materiasDe", () => {
  it("lista materias sin repetir por mayúsculas o tildes, ordenadas y sin vacías", () => {
    const lista = [
      tarea("1", { materia: "Matemática" }),
      tarea("2", { materia: "matematica" }),
      tarea("3", { materia: "Lengua" }),
      tarea("4", { materia: "  " }),
    ];
    expect(materiasDe(lista)).toEqual(["Lengua", "Matemática"]);
  });
});
