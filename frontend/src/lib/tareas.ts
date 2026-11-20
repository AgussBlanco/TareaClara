import type { Prioridad, Tarea } from "../types";
import { normalizarTexto } from "./utilidades";
import { parsearFechaISO } from "./vencimiento";

const ORDEN_PRIORIDAD: Record<Prioridad, number> = { Alta: 0, Media: 1, Baja: 2 };

/** Devuelve la lista con la tarea del servidor en lugar de la anterior (mismo id). */
export function reemplazarTarea(tareas: Tarea[], nueva: Tarea): Tarea[] {
  return tareas.map((t) => (t.id === nueva.id ? nueva : t));
}

export function quitarTarea(tareas: Tarea[], id: string): Tarea[] {
  return tareas.filter((t) => t.id !== id);
}

/**
 * Orden de la lista: primero las pendientes, por fecha límite más cercana;
 * a igual fecha, la de mayor prioridad. Las completadas van al final.
 */
export function compararTareas(a: Tarea, b: Tarea): number {
  const completadaA = a.estado === "Completada" ? 1 : 0;
  const completadaB = b.estado === "Completada" ? 1 : 0;
  if (completadaA !== completadaB) {
    return completadaA - completadaB;
  }

  const fechaValidaA = parsearFechaISO(a.fechaLimite) !== null;
  const fechaValidaB = parsearFechaISO(b.fechaLimite) !== null;
  if (fechaValidaA !== fechaValidaB) {
    return fechaValidaA ? -1 : 1;
  }

  if (a.fechaLimite !== b.fechaLimite) {
    return a.fechaLimite < b.fechaLimite ? -1 : 1;
  }

  const porPrioridad = ORDEN_PRIORIDAD[a.prioridad] - ORDEN_PRIORIDAD[b.prioridad];
  if (porPrioridad !== 0) {
    return porPrioridad;
  }

  return a.titulo.localeCompare(b.titulo, "es");
}

export function ordenarTareas(tareas: Tarea[]): Tarea[] {
  return [...tareas].sort(compararTareas);
}

/** Materias distintas (sin repetir por mayúsculas o tildes), para sugerir y filtrar. */
export function materiasDe(tareas: Tarea[]): string[] {
  const porClave = new Map<string, string>();
  for (const tarea of tareas) {
    const clave = normalizarTexto(tarea.materia);
    if (clave !== "" && !porClave.has(clave)) {
      porClave.set(clave, tarea.materia);
    }
  }
  return [...porClave.values()].sort((a, b) => a.localeCompare(b, "es"));
}
