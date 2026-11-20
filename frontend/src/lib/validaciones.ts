import {
  PRIORIDADES,
  type DatosTarea,
  type MaterialEstudio,
  type Prioridad,
  type TipoMaterial,
} from "../types";
import { parsearFechaISO } from "./vencimiento";

// Estos límites se repiten en el backend (backend/src/servicios/validacionesTarea.ts).
export const LIMITES = {
  tituloMax: 100,
  descripcionMax: 500,
  materiaMax: 50,
  materialTituloMax: 60,
  materialContenidoMax: 1000,
  anioMin: 2000,
  anioMax: 2100,
  nombreMin: 2,
  nombreMax: 60,
  contrasenaMin: 8,
  contrasenaMax: 200,
} as const;

export type Errores = Record<string, string>;

export type ResultadoValidacion<T> = { ok: true; datos: T } | { ok: false; errores: Errores };

export interface BorradorTarea {
  titulo: string;
  descripcion: string;
  materia: string;
  fechaLimite: string;
  prioridad: string;
  nota: string;
}

export interface BorradorMaterial {
  titulo: string;
  tipo: string;
  contenido: string;
}

export interface BorradorRegistro {
  nombre: string;
  email: string;
  contrasena: string;
}

export interface BorradorLogin {
  email: string;
  contrasena: string;
}

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGEX_NOTA = /^\d+(\.\d{1,2})?$/;

export function esPrioridad(valor: string): valor is Prioridad {
  return (PRIORIDADES as readonly string[]).includes(valor);
}

export function esTipoMaterial(valor: string): valor is TipoMaterial {
  return valor === "link" || valor === "texto";
}

/** Solo se aceptan enlaces http(s): evita enlaces peligrosos como "javascript:...". */
export function esUrlHttp(texto: string): boolean {
  try {
    const url = new URL(texto);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** "" -> null (sin nota); "8,5" -> 8.5; fuera de 0 a 10 o con formato raro -> "invalida". */
export function interpretarNota(texto: string): number | null | "invalida" {
  const limpio = texto.trim().replace(",", ".");
  if (limpio === "") {
    return null;
  }
  if (!REGEX_NOTA.test(limpio)) {
    return "invalida";
  }
  const nota = Number(limpio);
  return nota >= 0 && nota <= 10 ? nota : "invalida";
}

export function validarBorradorTarea(borrador: BorradorTarea): ResultadoValidacion<DatosTarea> {
  const errores: Errores = {};

  const titulo = borrador.titulo.trim();
  if (titulo === "") {
    errores.titulo = "El título es obligatorio.";
  } else if (titulo.length > LIMITES.tituloMax) {
    errores.titulo = `El título no puede superar los ${LIMITES.tituloMax} caracteres.`;
  }

  const descripcion = borrador.descripcion.trim();
  if (descripcion.length > LIMITES.descripcionMax) {
    errores.descripcion = `La descripción no puede superar los ${LIMITES.descripcionMax} caracteres.`;
  }

  const materia = borrador.materia.trim();
  if (materia === "") {
    errores.materia = "La materia es obligatoria.";
  } else if (materia.length > LIMITES.materiaMax) {
    errores.materia = `La materia no puede superar los ${LIMITES.materiaMax} caracteres.`;
  }

  if (borrador.fechaLimite === "") {
    errores.fechaLimite = "La fecha límite es obligatoria.";
  } else {
    const fecha = parsearFechaISO(borrador.fechaLimite);
    if (fecha === null) {
      errores.fechaLimite = "La fecha límite no es válida.";
    } else if (fecha.getFullYear() < LIMITES.anioMin || fecha.getFullYear() > LIMITES.anioMax) {
      errores.fechaLimite = `El año debe estar entre ${LIMITES.anioMin} y ${LIMITES.anioMax}.`;
    }
  }

  if (!esPrioridad(borrador.prioridad)) {
    errores.prioridad = "La prioridad debe ser Baja, Media o Alta.";
  }

  const nota = interpretarNota(borrador.nota);
  if (nota === "invalida") {
    errores.nota = "La nota debe ser un número entre 0 y 10 (hasta 2 decimales).";
  }

  if (Object.keys(errores).length > 0 || !esPrioridad(borrador.prioridad) || nota === "invalida") {
    return { ok: false, errores };
  }

  return {
    ok: true,
    datos: {
      titulo,
      descripcion,
      materia,
      fechaLimite: borrador.fechaLimite,
      prioridad: borrador.prioridad,
      nota,
    },
  };
}

export function validarMaterial(
  borrador: BorradorMaterial
): ResultadoValidacion<Omit<MaterialEstudio, "id">> {
  const errores: Errores = {};

  const titulo = borrador.titulo.trim();
  if (titulo === "") {
    errores.titulo = "El título del material es obligatorio.";
  } else if (titulo.length > LIMITES.materialTituloMax) {
    errores.titulo = `El título no puede superar los ${LIMITES.materialTituloMax} caracteres.`;
  }

  const contenido = borrador.contenido.trim();
  if (!esTipoMaterial(borrador.tipo)) {
    errores.tipo = "El tipo debe ser enlace o apunte.";
  } else if (contenido === "") {
    errores.contenido = borrador.tipo === "link" ? "El enlace es obligatorio." : "El apunte es obligatorio.";
  } else if (contenido.length > LIMITES.materialContenidoMax) {
    errores.contenido = `El contenido no puede superar los ${LIMITES.materialContenidoMax} caracteres.`;
  } else if (borrador.tipo === "link" && !esUrlHttp(contenido)) {
    errores.contenido = "El enlace debe empezar con http:// o https://.";
  }

  if (Object.keys(errores).length > 0 || !esTipoMaterial(borrador.tipo)) {
    return { ok: false, errores };
  }

  return { ok: true, datos: { titulo, tipo: borrador.tipo, contenido } };
}

export function validarRegistro(borrador: BorradorRegistro): ResultadoValidacion<BorradorRegistro> {
  const errores: Errores = {};

  const nombre = borrador.nombre.trim();
  if (nombre.length < LIMITES.nombreMin) {
    errores.nombre = `El nombre debe tener al menos ${LIMITES.nombreMin} caracteres.`;
  } else if (nombre.length > LIMITES.nombreMax) {
    errores.nombre = `El nombre no puede superar los ${LIMITES.nombreMax} caracteres.`;
  }

  const email = normalizarEmail(borrador.email);
  if (!REGEX_EMAIL.test(email)) {
    errores.email = "El email no es válido.";
  }

  if (borrador.contrasena.length < LIMITES.contrasenaMin) {
    errores.contrasena = `La contraseña debe tener al menos ${LIMITES.contrasenaMin} caracteres.`;
  } else if (borrador.contrasena.length > LIMITES.contrasenaMax) {
    errores.contrasena = `La contraseña no puede superar los ${LIMITES.contrasenaMax} caracteres.`;
  }

  if (Object.keys(errores).length > 0) {
    return { ok: false, errores };
  }
  return { ok: true, datos: { nombre, email, contrasena: borrador.contrasena } };
}

export function validarLogin(borrador: BorradorLogin): ResultadoValidacion<BorradorLogin> {
  const errores: Errores = {};

  const email = normalizarEmail(borrador.email);
  if (email === "") {
    errores.email = "El email es obligatorio.";
  }
  if (borrador.contrasena === "") {
    errores.contrasena = "La contraseña es obligatoria.";
  }

  if (Object.keys(errores).length > 0) {
    return { ok: false, errores };
  }
  return { ok: true, datos: { email, contrasena: borrador.contrasena } };
}
