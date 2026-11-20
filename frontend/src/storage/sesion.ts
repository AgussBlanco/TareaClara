const CLAVE = "tareaclara:token";

/** Lo único que se guarda en el navegador: el token de sesión. Con almacenamiento bloqueado, vive en memoria. */
export interface AlmacenSesion {
  leer(): string | null;
  guardar(token: string): void;
  borrar(): void;
}

export interface AlmacenClaveValor {
  getItem(clave: string): string | null;
  setItem(clave: string, valor: string): void;
  removeItem(clave: string): void;
}

export function crearAlmacenSesion(almacen: AlmacenClaveValor | null): AlmacenSesion {
  let enMemoria: string | null = null;
  return {
    leer() {
      try {
        return almacen?.getItem(CLAVE) ?? enMemoria;
      } catch {
        return enMemoria;
      }
    },
    guardar(token) {
      enMemoria = token;
      try {
        almacen?.setItem(CLAVE, token);
      } catch {
        /* queda en memoria: la sesión dura mientras la pestaña esté abierta */
      }
    },
    borrar() {
      enMemoria = null;
      try {
        almacen?.removeItem(CLAVE);
      } catch {
        /* nada que hacer */
      }
    },
  };
}

function almacenDelNavegador(): AlmacenClaveValor | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export const sesion = crearAlmacenSesion(almacenDelNavegador());
