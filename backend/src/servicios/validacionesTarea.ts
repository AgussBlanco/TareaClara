import { ErrorValidacion, type DetalleValidacion } from "../dominio/errores";
import { esFechaISOValida } from "../dominio/fechas";
import { PRIORIDADES, type Prioridad } from "../dominio/tipos";

// Estos límites se repiten en el frontend (frontend/src/lib/validaciones.ts).
// El backend es la fuente de verdad: el frontend solo los usa para avisar antes.
export const LIMITES = {
  tituloMax: 100,
  descripcionMax: 500,
  materiaMax: 50,
} as const;

export interface DatosNuevaTarea {
  titulo: string;
  descripcion: string;
  materia: string;
  fechaLimite: string;
  prioridad: Prioridad;
}

function esPrioridad(valor: unknown): valor is Prioridad {
  return typeof valor === "string" && (PRIORIDADES as readonly string[]).includes(valor);
}

function textoObligatorio(
  valor: unknown,
  campo: string,
  nombre: string,
  max: number,
  detalles: DetalleValidacion[]
): string {
  if (typeof valor !== "string") {
    detalles.push({ campo, mensaje: `${nombre} es obligatorio y debe ser texto.` });
    return "";
  }
  const texto = valor.trim();
  if (texto === "") {
    detalles.push({ campo, mensaje: `${nombre} no puede estar vacío.` });
  } else if (texto.length > max) {
    detalles.push({ campo, mensaje: `${nombre} no puede superar los ${max} caracteres.` });
  }
  return texto;
}

function textoOpcional(
  valor: unknown,
  campo: string,
  nombre: string,
  max: number,
  detalles: DetalleValidacion[]
): string {
  if (valor === undefined || valor === null) {
    return "";
  }
  if (typeof valor !== "string") {
    detalles.push({ campo, mensaje: `${nombre} debe ser texto.` });
    return "";
  }
  const texto = valor.trim();
  if (texto.length > max) {
    detalles.push({ campo, mensaje: `${nombre} no puede superar los ${max} caracteres.` });
  }
  return texto;
}

/**
 * Valida y limpia los datos para crear una tarea. Solo se leen los campos permitidos:
 * cualquier otro que mande el cliente (usuarioId, id, estado, nota...) se ignora.
 * Reúne todos los errores a la vez para que el cliente pueda corregirlos de una sola vez.
 */
export function validarNuevaTarea(entrada: unknown): DatosNuevaTarea {
  if (typeof entrada !== "object" || entrada === null || Array.isArray(entrada)) {
    throw new ErrorValidacion([{ campo: "cuerpo", mensaje: "El cuerpo de la petición debe ser un objeto JSON." }]);
  }
  const cuerpo = entrada as Record<string, unknown>;
  const detalles: DetalleValidacion[] = [];

  const titulo = textoObligatorio(cuerpo.titulo, "titulo", "El título", LIMITES.tituloMax, detalles);
  const materia = textoObligatorio(cuerpo.materia, "materia", "La materia", LIMITES.materiaMax, detalles);
  const descripcion = textoOpcional(cuerpo.descripcion, "descripcion", "La descripción", LIMITES.descripcionMax, detalles);

  let fechaLimite = "";
  if (typeof cuerpo.fechaLimite !== "string" || cuerpo.fechaLimite === "") {
    detalles.push({ campo: "fechaLimite", mensaje: "La fecha límite es obligatoria (formato AAAA-MM-DD)." });
  } else if (!esFechaISOValida(cuerpo.fechaLimite)) {
    detalles.push({ campo: "fechaLimite", mensaje: "La fecha límite no es una fecha válida (formato AAAA-MM-DD)." });
  } else {
    fechaLimite = cuerpo.fechaLimite;
  }

  let prioridad: Prioridad = "Media";
  if (cuerpo.prioridad !== undefined) {
    if (esPrioridad(cuerpo.prioridad)) {
      prioridad = cuerpo.prioridad;
    } else {
      detalles.push({ campo: "prioridad", mensaje: "La prioridad debe ser Baja, Media o Alta." });
    }
  }

  if (detalles.length > 0) {
    throw new ErrorValidacion(detalles);
  }
  return { titulo, descripcion, materia, fechaLimite, prioridad };
}
