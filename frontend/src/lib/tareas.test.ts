import { describe, expect, it } from "vitest";
import type { Tarea } from "../types";
import { tareaDePrueba } from "./tareaDePrueba";
import { materiasDe, ordenarTareas, quitarTarea, reemplazarTarea } from "./tareas";

function tarea(titulo: string, extra: Partial<Tarea> = {}): Tarea {
  return tareaDePrueba({ titulo, ...extra });
}

describe("reemplazarTarea y quitarTarea", () => {
  it("reemplaza solo la tarea con ese id, sin mutar la lista", () => {
    const lista = [tarea("A"), tarea("B")];
    const nueva = { ...lista[1], estado: "Completada" as const };
    const resultado = reemplazarTarea(lista, nueva);
    expect(resultado[1]).toBe(nueva);
    expect(resultado[0]).toBe(lista[0]);
    expect(lista[1].estado).toBe("No completada");
  });

  it("quita por id y deja el resto", () => {
    const lista = [tarea("A"), tarea("B")];
    expect(quitarTarea(lista, lista[0].id).map((t) => t.titulo)).toEqual(["B"]);
  });
});

describe("ordenarTareas", () => {
  it("RN-27: pendientes por fecha, luego prioridad; sin fecha válida después; completadas al final", () => {
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
