import { useCallback, useEffect, useState } from "react";
import { ErrorApi, type Api } from "../lib/api";
import { alVencerSesion } from "../lib/cliente";
import { mensajeDeError } from "../lib/utilidades";
import type { BorradorLogin, BorradorRegistro, Errores } from "../lib/validaciones";
import type { AlmacenSesion } from "../storage/sesion";
import type { Usuario } from "../types";

export type ResultadoAcceso = { ok: true } | { ok: false; errores: Errores };

/** Traduce un error del servidor a errores por campo (o uno general) para mostrar en el formulario. */
export function erroresDeAcceso(error: unknown): Errores {
  if (error instanceof ErrorApi && Object.keys(error.detalles).length > 0) {
    return { ...error.detalles };
  }
  return { general: mensajeDeError(error) };
}

/**
 * Sesión del usuario. Si hay un token guardado, arranca "cargando" y lo valida con el servidor (RN-34);
 * si ya no vale, se borra y se vuelve a la pantalla de acceso.
 */
export function useAuth(api: Api, sesion: AlmacenSesion) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState<boolean>(() => sesion.leer() !== null);

  useEffect(() => {
    let vigente = true;
    if (sesion.leer() !== null) {
      api
        .yo()
        .then((u) => {
          if (vigente) setUsuario(u);
        })
        .catch((error: unknown) => {
          // Solo un 401 invalida el token; si el servidor no responde se conserva para reintentar.
          if (vigente && error instanceof ErrorApi && error.estado === 401) {
            sesion.borrar();
          }
        })
        .finally(() => {
          if (vigente) setCargando(false);
        });
    }
    const dejarDeEscuchar = alVencerSesion(() => setUsuario(null));
    return () => {
      vigente = false;
      dejarDeEscuchar();
    };
  }, [api, sesion]);

  const entrar = useCallback(
    async (pedir: () => Promise<{ token: string; usuario: Usuario }>): Promise<ResultadoAcceso> => {
      try {
        const { token, usuario: nuevo } = await pedir();
        sesion.guardar(token);
        setUsuario(nuevo);
        return { ok: true };
      } catch (error) {
        return { ok: false, errores: erroresDeAcceso(error) };
      }
    },
    [sesion]
  );

  const registrar = useCallback((b: BorradorRegistro) => entrar(() => api.registro(b)), [api, entrar]);
  const iniciarSesion = useCallback((b: BorradorLogin) => entrar(() => api.login(b)), [api, entrar]);

  const cerrarSesion = useCallback(() => {
    sesion.borrar();
    setUsuario(null);
  }, [sesion]);

  return { usuario, cargando, registrar, iniciarSesion, cerrarSesion };
}
