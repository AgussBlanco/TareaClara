import { describe, expect, it } from "vitest";
import type { Tarea } from "../types";
import { FILTROS_INICIALES, filtrarTareas, hayFiltrosActivos } from "./filtros";
import { resumirTareas } from "./resumen";
import { tareaDePrueba } from "./tareaDePrueba";

function tarea(titulo: string, extra: Partial<Tarea> = {}): Tarea {
  return tareaDePrueba({ titulo, ...extra });
}

const lista = [
  tarea("TP de funciones", { materia: "Matemática", prioridad: "Alta", estado: "En proceso" }),
  tarea("Resumen de la Revolución", { materia: "Historia", prioridad: "Baja" }),
  tarea("Informe de laboratorio", { materia: "Física", prioridad: "Media", estado: "Completada" }),
];

describe("filtrarTareas", () => {
  it("sin filtros devuelve todo", () => {
    expect(filtrarTareas(lista, FILTROS_INICIALES)).toHaveLength(3);
    expect(hayFiltrosActivos(FILTROS_INICIALES)).toBe(false);
  });

  it("filtra por estado y por prioridad", () => {
    expect(filtrarTareas(lista, { ...FILTROS_INICIALES, estado: "En proceso" }).map((t) => t.titulo)).toEqual([
      "TP de funciones",
    ]);
    expect(filtrarTareas(lista, { ...FILTROS_INICIALES, prioridad: "Baja" }).map((t) => t.titulo)).toEqual([
      "Resumen de la Revolución",
    ]);
  });

  it("filtra por materia sin distinguir mayúsculas ni tildes", () => {
    expect(filtrarTareas(lista, { ...FILTROS_INICIALES, materia: "fisica" })).toHaveLength(1);
  });

  it("busca por título sin distinguir mayúsculas ni tildes", () => {
    expect(filtrarTareas(lista, { ...FILTROS_INICIALES, busqueda: "REVOLUCION" })).toHaveLength(1);
    expect(filtrarTareas(lista, { ...FILTROS_INICIALES, busqueda: "  lab " })).toHaveLength(1);
    expect(filtrarTareas(lista, { ...FILTROS_INICIALES, busqueda: "inexistente" })).toHaveLength(0);
  });

  it("combina varios filtros", () => {
    const filtros = { ...FILTROS_INICIALES, estado: "En proceso" as const, materia: "Historia" };
    expect(filtrarTareas(lista, filtros)).toHaveLength(0);
    expect(hayFiltrosActivos(filtros)).toBe(true);
  });
});

describe("resumirTareas", () => {
  it("cuenta pendientes, vencidas, próximas (incluye 'hoy') y completadas", () => {
    const hoy = new Date(2026, 9, 2, 18, 0);
    const tareas = [
      tarea("vencida", { fechaLimite: "2026-09-30" }),
      tarea("hoy", { fechaLimite: "2026-10-02" }),
      tarea("en 3 días", { fechaLimite: "2026-10-05" }),
      tarea("en 4 días", { fechaLimite: "2026-10-06" }),
      tarea("sin fecha válida", { fechaLimite: "" }),
      tarea("completada vencida", { fechaLimite: "2026-09-01", estado: "Completada" }),
    ];
    expect(resumirTareas(tareas, hoy)).toEqual({ pendientes: 5, vencidas: 1, proximas: 2, completadas: 1 });
  });
});
