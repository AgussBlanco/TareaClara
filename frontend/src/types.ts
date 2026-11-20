import type { EstadoTarea, Prioridad } from "./lib/vencimiento";

export type { EstadoTarea, Prioridad };

export type TipoMaterial = "link" | "texto";

export interface MaterialEstudio {
  id: string;
  titulo: string;
  tipo: TipoMaterial;
  contenido: string;
}

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
}

export interface Tarea {
  id: string;
  usuarioId: string;
  titulo: string;
  descripcion: string;
  materia: string;
  fechaLimite: string; // "YYYY-MM-DD"
  estado: EstadoTarea;
  prioridad: Prioridad;
  nota: number | null;
  materialEstudio: MaterialEstudio[];
  oculta: boolean;
  fechaCreacion: string; // fecha y hora ISO
  fechaCompletada: string | null;
}

/** Los campos que la persona edita en el formulario, ya validados. */
export interface DatosTarea {
  titulo: string;
  descripcion: string;
  materia: string;
  fechaLimite: string;
  prioridad: Prioridad;
  nota: number | null;
}

export const ESTADOS: readonly EstadoTarea[] = ["No completada", "En proceso", "Completada"];
export const PRIORIDADES: readonly Prioridad[] = ["Baja", "Media", "Alta"];
