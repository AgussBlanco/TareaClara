import type { Tarea } from "../types";
import { DIAS_PARA_CONSIDERAR_PROXIMA, calcularDiasRestantes } from "./vencimiento";

export interface Resumen {
  pendientes: number;
  vencidas: number;
  proximas: number;
  completadas: number;
}

/** Cuenta las tareas por situación. "Próximas" incluye las que vencen hoy. */
export function resumirTareas(tareas: Tarea[], hoy: Date): Resumen {
  const resumen: Resumen = { pendientes: 0, vencidas: 0, proximas: 0, completadas: 0 };

  for (const tarea of tareas) {
    if (tarea.estado === "Completada") {
      resumen.completadas += 1;
      continue;
    }
    resumen.pendientes += 1;

    const dias = calcularDiasRestantes(tarea.fechaLimite, hoy);
    if (dias === null) {
      continue;
    }
    if (dias < 0) {
      resumen.vencidas += 1;
    } else if (dias <= DIAS_PARA_CONSIDERAR_PROXIMA) {
      resumen.proximas += 1;
    }
  }

  return resumen;
}
