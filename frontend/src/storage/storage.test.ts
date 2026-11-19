import { describe, expect, it } from "vitest";
import { crearTarea } from "../lib/tareas";
import type { Tarea, Usuario } from "../types";
import { ErrorAlmacenamiento, crearAlmacenEnMemoria, crearStorage, type AlmacenClaveValor } from "./storage";

function tarea(usuarioId: string, titulo: string): Tarea {
  return crearTarea(usuarioId, {
    titulo,
    descripcion: "",
    materia: "Lengua",
    fechaLimite: "2026-10-10",
    prioridad: "Media",
    nota: null,
  });
}

const ana: Usuario = { id: "u1", nombre: "Ana", email: "ana@correo.com", contrasenaHash: "hash" };

describe("storage de tareas y usuarios", () => {
  it("devuelve listas vacías si no hay nada guardado", () => {
    const storage = crearStorage(crearAlmacenEnMemoria());
    expect(storage.leerUsuarios()).toEqual([]);
    expect(storage.leerTareasDeUsuario("u1")).toEqual([]);
    expect(storage.leerSesion()).toBeNull();
  });

  it("guarda y vuelve a leer usuarios y sesión", () => {
    const storage = crearStorage(crearAlmacenEnMemoria());
    storage.guardarUsuarios([ana]);
    storage.guardarSesion("u1");
    expect(storage.leerUsuarios()).toEqual([ana]);
    expect(storage.leerSesion()).toBe("u1");
    storage.borrarSesion();
    expect(storage.leerSesion()).toBeNull();
  });

  it("cada usuario ve solo sus tareas y guardar las de uno no pisa las del otro", () => {
    const storage = crearStorage(crearAlmacenEnMemoria());
    storage.guardarTareasDeUsuario("u1", [tarea("u1", "De Ana")]);
    storage.guardarTareasDeUsuario("u2", [tarea("u2", "De Luis")]);
    storage.guardarTareasDeUsuario("u1", [tarea("u1", "De Ana (cambiada)")]);

    expect(storage.leerTareasDeUsuario("u1").map((t) => t.titulo)).toEqual(["De Ana (cambiada)"]);
    expect(storage.leerTareasDeUsuario("u2").map((t) => t.titulo)).toEqual(["De Luis"]);
  });

  it("al guardar ignora tareas que pertenecen a otro usuario", () => {
    const storage = crearStorage(crearAlmacenEnMemoria());
    storage.guardarTareasDeUsuario("u1", [tarea("u1", "Propia"), tarea("u2", "Ajena")]);
    expect(storage.leerTareasDeUsuario("u1").map((t) => t.titulo)).toEqual(["Propia"]);
    expect(storage.leerTareasDeUsuario("u2")).toEqual([]);
  });
});

describe("storage ante datos dañados", () => {
  it("con JSON roto no se cae: devuelve vacío y guarda una copia del contenido dañado", () => {
    const almacen = crearAlmacenEnMemoria();
    almacen.setItem("tareaclara:tareas", "{esto no es json");
    const storage = crearStorage(almacen);

    expect(storage.leerTareasDeUsuario("u1")).toEqual([]);
    expect(almacen.getItem("tareaclara:tareas:corrupto")).toBe("{esto no es json");
  });

  it("descarta los registros con forma inválida y conserva los válidos", () => {
    const almacen = crearAlmacenEnMemoria();
    const buena = tarea("u1", "Buena");
    const mala = { ...tarea("u1", "Mala"), estado: "Inventado" };
    almacen.setItem("tareaclara:tareas", JSON.stringify([buena, mala, 42, null, "texto"]));

    expect(crearStorage(almacen).leerTareasDeUsuario("u1").map((t) => t.titulo)).toEqual(["Buena"]);
  });

  it("si lo guardado no es una lista, devuelve vacío", () => {
    const almacen = crearAlmacenEnMemoria();
    almacen.setItem("tareaclara:usuarios", JSON.stringify({ a: 1 }));
    expect(crearStorage(almacen).leerUsuarios()).toEqual([]);
  });

  it("si el almacenamiento está lleno, guardar avisa con ErrorAlmacenamiento", () => {
    const lleno: AlmacenClaveValor = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => {},
    };
    const storage = crearStorage(lleno);
    expect(() => storage.guardarTareasDeUsuario("u1", [tarea("u1", "X")])).toThrow(ErrorAlmacenamiento);
    expect(() => storage.guardarUsuarios([ana])).toThrow(ErrorAlmacenamiento);
  });

  it("si el almacenamiento está bloqueado, leer no lanza error", () => {
    const bloqueado: AlmacenClaveValor = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {},
      removeItem: () => {},
    };
    const storage = crearStorage(bloqueado);
    expect(storage.leerUsuarios()).toEqual([]);
    expect(storage.leerSesion()).toBeNull();
  });
});
