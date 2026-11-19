// vencimiento.ts (lógica pura; viene de la Mini actividad de la Clase 10)
export type EstadoTarea = "No completada" | "En proceso" | "Completada";
export type Prioridad = "Baja" | "Media" | "Alta";
export type NivelUrgencia = "completada" | "critico" | "atencion" | "normal";

export interface TareaConFecha {
  estado: EstadoTarea;
  prioridad: Prioridad;
  fechaLimite: string; // formato "YYYY-MM-DD"
}

export interface EstadoVencimiento {
  nivel: NivelUrgencia;
  diasRestantes: number | null; // null si la fecha límite no es válida
}

export const DIAS_PARA_CONSIDERAR_PROXIMA = 3;

const MILISEGUNDOS_POR_DIA = 1000 * 60 * 60 * 24;
const FORMATO_FECHA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parsearFechaISO(fechaISO: string): Date | null {
  const coincidencia = FORMATO_FECHA_ISO.exec(fechaISO);
  if (!coincidencia) {
    return null;
  }

  const anio = Number(coincidencia[1]);
  const mes = Number(coincidencia[2]);
  const dia = Number(coincidencia[3]);

  const fecha = new Date(anio, mes - 1, dia);
  const esFechaReal =
    fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;

  return esFechaReal ? fecha : null;
}

function medianocheEnMilisegundos(fecha: Date): number {
  return Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

export function calcularDiasRestantes(fechaLimiteISO: string, hoy: Date): number | null {
  const fechaLimite = parsearFechaISO(fechaLimiteISO);
  if (!fechaLimite) {
    return null;
  }

  const diferencia = medianocheEnMilisegundos(fechaLimite) - medianocheEnMilisegundos(hoy);
  return diferencia / MILISEGUNDOS_POR_DIA;
}

function determinarNivel(tarea: TareaConFecha, diasRestantes: number | null): NivelUrgencia {
  if (tarea.estado === "Completada") {
    return "completada";
  }
  if (diasRestantes === null) {
    return "normal";
  }
  if (diasRestantes <= 0) {
    return "critico";
  }
  if (diasRestantes <= DIAS_PARA_CONSIDERAR_PROXIMA) {
    return tarea.prioridad === "Alta" ? "critico" : "atencion";
  }
  return "normal";
}

export function calcularEstadoVencimiento(
  tarea: TareaConFecha,
  hoy: Date = new Date()
): EstadoVencimiento {
  const diasRestantes = calcularDiasRestantes(tarea.fechaLimite, hoy);
  return { nivel: determinarNivel(tarea, diasRestantes), diasRestantes };
}
