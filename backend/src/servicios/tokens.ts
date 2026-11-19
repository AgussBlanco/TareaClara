import jwt from "jsonwebtoken";

export const DURACION_TOKEN = "7d"; // RN-04

/** Crea el token de sesión. El único dato que lleva es el id del usuario ("sub"). */
export function crearToken(usuarioId: string, secreto: string): string {
  return jwt.sign({}, secreto, { subject: usuarioId, expiresIn: DURACION_TOKEN, algorithm: "HS256" });
}

/** Devuelve el id del usuario si el token es auténtico y no venció; si no, null (RN-05). */
export function verificarToken(token: string, secreto: string): string | null {
  try {
    const datos = jwt.verify(token, secreto, { algorithms: ["HS256"] });
    return typeof datos === "object" && typeof datos.sub === "string" ? datos.sub : null;
  } catch {
    return null;
  }
}
