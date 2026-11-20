import { ErrorValidacion, type DetalleValidacion } from "../dominio/errores";
import { esFechaISOValida } from "../dominio/fechas";
import { PRIORIDADES, type Prioridad } from "../dominio/tipos";

// Estos límites se repiten en el frontend (frontend/src/lib/validaciones.ts).
// El backend es la fuente de verdad: el frontend solo los usa para avisar antes.
export const LIMITES = {
  tituloMax: 100,
  descripcionMax: 500,
  materiaMax: 50,
  notaMax: 10,
} as const;

/** Los seis datos que el estudiante escribe: sirven para crear y para editar una tarea. */
export interface DatosTarea {
  titulo: string;
  descripcion: string;
  materia: string;
  fechaLimite: string;
  prioridad: Prioridad;
  nota: number | null;
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

/** RN-17: nota entre 0 y 10 con hasta 2 decimales; null o ausente significa "sin nota". */
function validarNota(valor: unknown, detalles: DetalleValidacion[]): number | null {
  if (valor === undefined || valor === null) {
    return null;
  }
  const esValida =
    typeof valor === "number" &&
    Number.isFinite(valor) &&
    valor >= 0 &&
    valor <= LIMITES.notaMax &&
    Number(valor.toFixed(2)) === valor;
  if (!esValida) {
    detalles.push({ campo: "nota", mensaje: "La nota debe ser un número entre 0 y 10, con hasta 2 decimales." });
    return null;
  }
  return valor;
}

/**
 * Valida y limpia los datos de una tarea. Solo se leen los campos permitidos: cualquier otro que mande el
 * cliente (usuarioId, id, estado, oculta...) se ignora. Reúne todos los errores a la vez para que el cliente
 * pueda corregirlos de una sola vez.
 *
 * Al crear (RN-13), si no se indica prioridad es Media. Al editar, la prioridad es obligatoria: editar
 * reemplaza los seis datos, así que no se puede "perder" un valor por olvido.
 */
function validarDatosTarea(entrada: unknown, prioridadObligatoria: boolean): DatosTarea {
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
  if (cuerpo.prioridad === undefined && prioridadObligatoria) {
    detalles.push({ campo: "prioridad", mensaje: "La prioridad es obligatoria (Baja, Media o Alta)." });
  } else if (cuerpo.prioridad !== undefined) {
    if (esPrioridad(cuerpo.prioridad)) {
      prioridad = cuerpo.prioridad;
    } else {
      detalles.push({ campo: "prioridad", mensaje: "La prioridad debe ser Baja, Media o Alta." });
    }
  }

  const nota = validarNota(cuerpo.nota, detalles);

  if (detalles.length > 0) {
    throw new ErrorValidacion(detalles);
  }
  return { titulo, descripcion, materia, fechaLimite, prioridad, nota };
}

/** RN-08 a RN-14: datos para crear una tarea. */
export function validarNuevaTarea(entrada: unknown): DatosTarea {
  return validarDatosTarea(entrada, false);
}

/** RN-18: datos para editar una tarea. */
export function validarEdicionTarea(entrada: unknown): DatosTarea {
  return validarDatosTarea(entrada, true);
}
