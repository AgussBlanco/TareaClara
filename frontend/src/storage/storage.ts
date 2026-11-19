import { ESTADOS, PRIORIDADES, type MaterialEstudio, type Tarea, type Usuario } from "../types";

/** Lo mínimo que necesitamos de localStorage; permite probar el módulo sin navegador. */
export interface AlmacenClaveValor {
  getItem(clave: string): string | null;
  setItem(clave: string, valor: string): void;
  removeItem(clave: string): void;
}

export class ErrorAlmacenamiento extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorAlmacenamiento";
  }
}

const CLAVES = {
  usuarios: "tareaclara:usuarios",
  tareas: "tareaclara:tareas",
  sesion: "tareaclara:sesion",
} as const;

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function esUsuario(valor: unknown): valor is Usuario {
  return (
    esObjeto(valor) &&
    typeof valor.id === "string" &&
    typeof valor.nombre === "string" &&
    typeof valor.email === "string" &&
    typeof valor.contrasenaHash === "string"
  );
}

function esMaterial(valor: unknown): valor is MaterialEstudio {
  return (
    esObjeto(valor) &&
    typeof valor.id === "string" &&
    typeof valor.titulo === "string" &&
    (valor.tipo === "link" || valor.tipo === "texto") &&
    typeof valor.contenido === "string"
  );
}

function esTarea(valor: unknown): valor is Tarea {
  return (
    esObjeto(valor) &&
    typeof valor.id === "string" &&
    typeof valor.usuarioId === "string" &&
    typeof valor.titulo === "string" &&
    typeof valor.descripcion === "string" &&
    typeof valor.materia === "string" &&
    typeof valor.fechaLimite === "string" &&
    typeof valor.estado === "string" &&
    (ESTADOS as readonly string[]).includes(valor.estado) &&
    typeof valor.prioridad === "string" &&
    (PRIORIDADES as readonly string[]).includes(valor.prioridad) &&
    (valor.nota === null || typeof valor.nota === "number") &&
    Array.isArray(valor.materialEstudio) &&
    valor.materialEstudio.every(esMaterial) &&
    typeof valor.oculta === "boolean" &&
    typeof valor.fechaCreacion === "string" &&
    (valor.fechaCompletada === null || typeof valor.fechaCompletada === "string")
  );
}

export function crearAlmacenEnMemoria(): AlmacenClaveValor {
  const datos = new Map<string, string>();
  return {
    getItem: (clave) => datos.get(clave) ?? null,
    setItem: (clave, valor) => {
      datos.set(clave, valor);
    },
    removeItem: (clave) => {
      datos.delete(clave);
    },
  };
}

/**
 * Único módulo que toca el almacenamiento del navegador. Los componentes y los hooks
 * nunca leen ni escriben localStorage directamente.
 */
export function crearStorage(almacen: AlmacenClaveValor) {
  function leerLista<T>(clave: string, esValido: (valor: unknown) => valor is T): T[] {
    let crudo: string | null;
    try {
      crudo = almacen.getItem(clave);
    } catch {
      return [];
    }
    if (crudo === null) {
      return [];
    }
    try {
      const dato: unknown = JSON.parse(crudo);
      return Array.isArray(dato) ? dato.filter(esValido) : [];
    } catch {
      // JSON roto: se guarda una copia aparte para no perderlo y se arranca con la lista vacía.
      try {
        almacen.setItem(`${clave}:corrupto`, crudo);
      } catch {
        /* sin espacio para la copia: se sigue igual */
      }
      return [];
    }
  }

  function escribir(clave: string, valor: unknown): void {
    try {
      almacen.setItem(clave, JSON.stringify(valor));
    } catch {
      throw new ErrorAlmacenamiento(
        "No se pudo guardar: el almacenamiento del navegador está lleno o bloqueado."
      );
    }
  }

  return {
    leerUsuarios(): Usuario[] {
      return leerLista(CLAVES.usuarios, esUsuario);
    },

    guardarUsuarios(usuarios: Usuario[]): void {
      escribir(CLAVES.usuarios, usuarios);
    },

    leerTareasDeUsuario(usuarioId: string): Tarea[] {
      return leerLista(CLAVES.tareas, esTarea).filter((t) => t.usuarioId === usuarioId);
    },

    /** Reemplaza solo las tareas de ese usuario: las de otros usuarios no se tocan. */
    guardarTareasDeUsuario(usuarioId: string, tareas: Tarea[]): void {
      const deOtros = leerLista(CLAVES.tareas, esTarea).filter((t) => t.usuarioId !== usuarioId);
      const propias = tareas.filter((t) => t.usuarioId === usuarioId);
      escribir(CLAVES.tareas, [...deOtros, ...propias]);
    },

    leerSesion(): string | null {
      try {
        return almacen.getItem(CLAVES.sesion);
      } catch {
        return null;
      }
    },

    guardarSesion(usuarioId: string): void {
      try {
        almacen.setItem(CLAVES.sesion, usuarioId);
      } catch {
        throw new ErrorAlmacenamiento("No se pudo iniciar la sesión: el almacenamiento está bloqueado.");
      }
    },

    borrarSesion(): void {
      try {
        almacen.removeItem(CLAVES.sesion);
      } catch {
        /* nada que hacer */
      }
    },
  };
}

function elegirAlmacenDelNavegador(): { almacen: AlmacenClaveValor; persistente: boolean } {
  try {
    const prueba = "tareaclara:__prueba";
    window.localStorage.setItem(prueba, "1");
    window.localStorage.removeItem(prueba);
    return { almacen: window.localStorage, persistente: true };
  } catch {
    // Sin localStorage (modo privado estricto, bloqueado, o sin navegador): se usa memoria.
    return { almacen: crearAlmacenEnMemoria(), persistente: false };
  }
}

const eleccion = elegirAlmacenDelNavegador();

/** false si el navegador bloquea localStorage: los datos se perderían al cerrar la pestaña. */
export const almacenamientoPersistente: boolean = eleccion.persistente;

export const storage = crearStorage(eleccion.almacen);
