import type { Tarea } from "../types";

/** Solo para tests: arma una tarea completa con valores razonables. */
export function tareaDePrueba(extra: Partial<Tarea> = {}): Tarea {
  return {
    id: `t-${Math.random().toString(36).slice(2, 10)}`,
    usuarioId: "u1",
    titulo: "TP de funciones",
    descripcion: "",
    materia: "Matemática",
    fechaLimite: "2026-10-10",
    estado: "No completada",
    prioridad: "Media",
    nota: null,
    materialEstudio: [],
    oculta: false,
    fechaCreacion: "2026-10-02T21:30:00.000Z",
    fechaCompletada: null,
    ...extra,
  };
}
