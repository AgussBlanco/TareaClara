import { ESTADOS, PRIORIDADES, type EstadoTarea, type Prioridad, type Tarea } from "../types";
import { normalizarTexto } from "./utilidades";

export interface Filtros {
  estado: EstadoTarea | "Todos";
  prioridad: Prioridad | "Todas";
  materia: string; // "" = todas
  busqueda: string;
}

export const FILTROS_INICIALES: Filtros = {
  estado: "Todos",
  prioridad: "Todas",
  materia: "",
  busqueda: "",
};

export function esEstadoFiltro(valor: string): valor is Filtros["estado"] {
  return valor === "Todos" || (ESTADOS as readonly string[]).includes(valor);
}

export function esPrioridadFiltro(valor: string): valor is Filtros["prioridad"] {
  return valor === "Todas" || (PRIORIDADES as readonly string[]).includes(valor);
}

export function hayFiltrosActivos(filtros: Filtros): boolean {
  return (
    filtros.estado !== "Todos" ||
    filtros.prioridad !== "Todas" ||
    filtros.materia !== "" ||
    filtros.busqueda.trim() !== ""
  );
}

export function filtrarTareas(tareas: Tarea[], filtros: Filtros): Tarea[] {
  const busqueda = normalizarTexto(filtros.busqueda);
  const materia = normalizarTexto(filtros.materia);

  return tareas.filter((tarea) => {
    if (filtros.estado !== "Todos" && tarea.estado !== filtros.estado) {
      return false;
    }
    if (filtros.prioridad !== "Todas" && tarea.prioridad !== filtros.prioridad) {
      return false;
    }
    if (materia !== "" && normalizarTexto(tarea.materia) !== materia) {
      return false;
    }
    if (busqueda !== "" && !normalizarTexto(tarea.titulo).includes(busqueda)) {
      return false;
    }
    return true;
  });
}
