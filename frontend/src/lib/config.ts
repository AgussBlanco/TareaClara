/** Dirección del servidor, sin barra final. Viene de VITE_API_URL al compilar (ver docs/guia-de-despliegue.md). */
export type ResultadoConfig = { ok: true; apiUrl: string } | { ok: false; mensaje: string };

export function leerConfiguracion(entorno: { VITE_API_URL?: string; DEV?: boolean }): ResultadoConfig {
  const crudo = (entorno.VITE_API_URL ?? "").trim();
  if (crudo === "") {
    if (entorno.DEV) {
      return { ok: true, apiUrl: "http://localhost:3000" };
    }
    return {
      ok: false,
      mensaje: "Falta configurar VITE_API_URL: la dirección del servidor de TareaClara.",
    };
  }
  let url: URL;
  try {
    url = new URL(crudo);
  } catch {
    return { ok: false, mensaje: "VITE_API_URL no es una dirección válida." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, mensaje: "VITE_API_URL debe empezar con http:// o https://." };
  }
  return { ok: true, apiUrl: crudo.replace(/\/+$/, "") };
}
