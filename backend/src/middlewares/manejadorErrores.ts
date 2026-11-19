import type { ErrorRequestHandler, RequestHandler } from "express";
import { ErrorConflicto, ErrorNoAutenticado, ErrorNoEncontrado, ErrorValidacion } from "../dominio/errores";

function tipoDeErrorHttp(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "type" in error) {
    const tipo = (error as { type: unknown }).type;
    return typeof tipo === "string" ? tipo : undefined;
  }
  return undefined;
}

export const rutaNoEncontrada: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { codigo: "NO_ENCONTRADO", mensaje: "La ruta no existe." } });
};

/**
 * Convierte cada tipo de error en la respuesta HTTP que corresponde. Todas tienen la misma forma:
 *   { "error": { "codigo": "...", "mensaje": "...", "detalles"?: [...] } }
 * Los errores inesperados se registran en el servidor pero no se detallan al cliente.
 */
export const manejadorErrores: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ErrorValidacion) {
    res.status(400).json({ error: { codigo: "VALIDACION", mensaje: error.message, detalles: error.detalles } });
    return;
  }
  if (error instanceof ErrorNoAutenticado) {
    res.status(401).json({ error: { codigo: "NO_AUTENTICADO", mensaje: error.message } });
    return;
  }

  if (error instanceof ErrorNoEncontrado) {
    res.status(404).json({ error: { codigo: "NO_ENCONTRADO", mensaje: error.message } });
    return;
  }
  if (error instanceof ErrorConflicto) {
    res.status(409).json({ error: { codigo: "CONFLICTO", mensaje: error.message } });
    return;
  }

  const tipo = tipoDeErrorHttp(error);
  if (tipo === "entity.parse.failed") {
    res.status(400).json({ error: { codigo: "JSON_INVALIDO", mensaje: "El cuerpo de la petición no es un JSON válido." } });
    return;
  }
  if (tipo === "entity.too.large") {
    res.status(413).json({ error: { codigo: "CUERPO_MUY_GRANDE", mensaje: "El cuerpo de la petición es demasiado grande." } });
    return;
  }

  console.error(error);
  res.status(500).json({ error: { codigo: "ERROR_INTERNO", mensaje: "Ocurrió un error inesperado." } });
};
