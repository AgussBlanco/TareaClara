export type EstadoTarea = "No completada" | "En proceso" | "Completada";
export type Prioridad = "Baja" | "Media" | "Alta";
export type TipoMaterial = "link" | "texto";

export const ESTADOS: readonly EstadoTarea[] = ["No completada", "En proceso", "Completada"];
export const PRIORIDADES: readonly Prioridad[] = ["Baja", "Media", "Alta"];

export interface MaterialEstudio {
  id: string;
  titulo: string;
  tipo: TipoMaterial;
  contenido: string;
}

// Misma forma que la Tarea del frontend (frontend/src/types.ts), para que la
// integración posterior no requiera traducir nada.
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

export interface UsuarioNuevo {
  id: string;
  nombre: string;
  email: string;
  contrasenaHash: string;
}
