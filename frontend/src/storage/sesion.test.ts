import { describe, expect, it } from "vitest";
import { crearAlmacenSesion, type AlmacenClaveValor } from "./sesion";

function almacenFalso(): AlmacenClaveValor & { datos: Map<string, string> } {
  const datos = new Map<string, string>();
  return {
    datos,
    getItem: (c) => datos.get(c) ?? null,
    setItem: (c, v) => void datos.set(c, v),
    removeItem: (c) => void datos.delete(c),
  };
}

const bloqueado: AlmacenClaveValor = {
  getItem: () => {
    throw new Error("bloqueado");
  },
  setItem: () => {
    throw new Error("bloqueado");
  },
  removeItem: () => {
    throw new Error("bloqueado");
  },
};

describe("almacén de sesión", () => {
  it("guarda, lee y borra el token", () => {
    const almacen = almacenFalso();
    const s = crearAlmacenSesion(almacen);
    expect(s.leer()).toBeNull();
    s.guardar("abc");
    expect(s.leer()).toBe("abc");
    expect(almacen.datos.get("tareaclara:token")).toBe("abc");
    s.borrar();
    expect(s.leer()).toBeNull();
    expect(almacen.datos.size).toBe(0);
  });

  it("con el almacenamiento bloqueado o ausente, la sesión vive en memoria", () => {
    for (const base of [bloqueado, null]) {
      const s = crearAlmacenSesion(base);
      s.guardar("abc");
      expect(s.leer()).toBe("abc");
      s.borrar();
      expect(s.leer()).toBeNull();
    }
  });
});
