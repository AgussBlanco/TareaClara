// textosVencimiento.ts (capa de presentación; viene de la Mini actividad de la Clase 10)
import {
  DIAS_PARA_CONSIDERAR_PROXIMA,
  parsearFechaISO,
  type EstadoVencimiento,
} from "./vencimiento";

function formatearDias(cantidad: number): string {
  return cantidad === 1 ? "1 día" : `${cantidad} días`;
}

export function describirVencimiento({ nivel, diasRestantes }: EstadoVencimiento): string {
  if (nivel === "completada") {
    return "Completada";
  }
  if (diasRestantes === null) {
    return "Sin fecha límite";
  }
  if (diasRestantes < 0) {
    return `Vencida hace ${formatearDias(-diasRestantes)}`;
  }
  if (diasRestantes === 0) {
    return "Vence hoy";
  }
  if (diasRestantes <= DIAS_PARA_CONSIDERAR_PROXIMA) {
    return `Vence en ${formatearDias(diasRestantes)}`;
  }
  return `Faltan ${formatearDias(diasRestantes)}`;
}

export function formatearFechaLimite(fechaISO: string): string {
  if (!parsearFechaISO(fechaISO)) {
    return "";
  }
  const [anio, mes, dia] = fechaISO.split("-");
  return `${dia}/${mes}/${anio}`;
}
