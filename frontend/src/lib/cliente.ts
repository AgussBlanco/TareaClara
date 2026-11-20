import { crearApi, type Api } from "./api";
import { leerConfiguracion } from "./config";
import { sesion } from "../storage/sesion";

type Oyente = () => void;
const oyentesDeSesionVencida = new Set<Oyente>();

/** Avisa cuando el servidor rechaza el token (RN-34). Devuelve la función para dejar de escuchar. */
export function alVencerSesion(oyente: Oyente): () => void {
  oyentesDeSesionVencida.add(oyente);
  return () => {
    oyentesDeSesionVencida.delete(oyente);
  };
}

const config = leerConfiguracion(import.meta.env);

export const errorDeConfiguracion: string | null = config.ok ? null : config.mensaje;

export const api: Api | null = config.ok
  ? crearApi({
      baseUrl: config.apiUrl,
      obtenerToken: () => sesion.leer(),
      alVencerSesion: () => {
        sesion.borrar();
        oyentesDeSesionVencida.forEach((oyente) => oyente());
      },
    })
  : null;
