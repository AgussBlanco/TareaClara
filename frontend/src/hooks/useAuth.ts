import { useCallback, useState } from "react";
import { autenticar, crearUsuario } from "../lib/cuentas";
import { mensajeDeError } from "../lib/utilidades";
import type { BorradorLogin, BorradorRegistro, Errores } from "../lib/validaciones";
import { storage } from "../storage/storage";
import type { Usuario, UsuarioPublico } from "../types";

export type ResultadoAcceso = { ok: true } | { ok: false; errores: Errores };

function aPublico({ id, nombre, email }: Usuario): UsuarioPublico {
  return { id, nombre, email };
}

function cargarSesion(): UsuarioPublico | null {
  const id = storage.leerSesion();
  if (id === null) {
    return null;
  }
  const usuario = storage.leerUsuarios().find((u) => u.id === id);
  return usuario ? aPublico(usuario) : null;
}

export function useAuth() {
  const [usuario, setUsuario] = useState<UsuarioPublico | null>(cargarSesion);

  const registrar = useCallback(async (borrador: BorradorRegistro): Promise<ResultadoAcceso> => {
    try {
      const usuarios = storage.leerUsuarios();
      const resultado = await crearUsuario(usuarios, borrador);
      if (!resultado.ok) {
        return resultado;
      }
      storage.guardarUsuarios([...usuarios, resultado.usuario]);
      storage.guardarSesion(resultado.usuario.id);
      setUsuario(aPublico(resultado.usuario));
      return { ok: true };
    } catch (error) {
      return { ok: false, errores: { general: mensajeDeError(error) } };
    }
  }, []);

  const iniciarSesion = useCallback(async (borrador: BorradorLogin): Promise<ResultadoAcceso> => {
    try {
      const resultado = await autenticar(storage.leerUsuarios(), borrador);
      if (!resultado.ok) {
        return resultado;
      }
      storage.guardarSesion(resultado.usuario.id);
      setUsuario(aPublico(resultado.usuario));
      return { ok: true };
    } catch (error) {
      return { ok: false, errores: { general: mensajeDeError(error) } };
    }
  }, []);

  const cerrarSesion = useCallback(() => {
    storage.borrarSesion();
    setUsuario(null);
  }, []);

  return { usuario, registrar, iniciarSesion, cerrarSesion };
}
