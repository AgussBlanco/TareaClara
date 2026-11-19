import {
  type DatosTarea,
  type EstadoTarea,
  type MaterialEstudio,
  type Prioridad,
  type Tarea,
} from "../types";
import { normalizarTexto, generarId } from "./utilidades";
import { parsearFechaISO } from "./vencimiento";

const ORDEN_PRIORIDAD: Record<Prioridad, number> = { Alta: 0, Media: 1, Baja: 2 };

export function crearTarea(usuarioId: string, datos: DatosTarea, ahora: Date = new Date()): Tarea {
  return {
    id: generarId(),
    usuarioId,
    ...datos,
    estado: "No completada",
    materialEstudio: [],
    oculta: false,
    fechaCreacion: ahora.toISOString(),
    fechaCompletada: null,
  };
}

export function editarTarea(tarea: Tarea, datos: DatosTarea): Tarea {
  return { ...tarea, ...datos };
}

/** Al completar se guarda la fecha; al volver a otro estado esa fecha se borra. */
export function cambiarEstado(tarea: Tarea, estado: EstadoTarea, ahora: Date = new Date()): Tarea {
  if (tarea.estado === estado) {
    return tarea;
  }
  return {
    ...tarea,
    estado,
    fechaCompletada: estado === "Completada" ? ahora.toISOString() : null,
  };
}

export function alternarOculta(tarea: Tarea): Tarea {
  return { ...tarea, oculta: !tarea.oculta };
}

export function agregarMaterial(tarea: Tarea, material: Omit<MaterialEstudio, "id">): Tarea {
  return { ...tarea, materialEstudio: [...tarea.materialEstudio, { id: generarId(), ...material }] };
}

export function quitarMaterial(tarea: Tarea, materialId: string): Tarea {
  return { ...tarea, materialEstudio: tarea.materialEstudio.filter((m) => m.id !== materialId) };
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
