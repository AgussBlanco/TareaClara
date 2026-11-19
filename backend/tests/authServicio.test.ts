import { describe, expect, it } from "vitest";
import { ErrorConflicto, ErrorNoAutenticado, ErrorValidacion } from "../src/dominio/errores";
import { AuthServicio } from "../src/servicios/authServicio";
import { UsuarioRepositorioEnMemoria } from "./ayudas/usuarioRepositorioEnMemoria";

const SECRETO = "secreto-solo-para-tests-0123456789abcdef";
const valido = { nombre: "Ana Pérez", email: "Ana@Correo.com", contrasena: "contraseña-segura" };

function crear() {
  const repositorio = new UsuarioRepositorioEnMemoria();
  return { repositorio, servicio: new AuthServicio(repositorio, SECRETO) };
}

async function campos(promesa: Promise<unknown>): Promise<string[]> {
  try {
    await promesa;
  } catch (error) {
    if (error instanceof ErrorValidacion) {
      return error.detalles.map((d) => d.campo).sort();
    }
    throw error;
  }
  throw new Error("Se esperaba un ErrorValidacion");
}

describe("AuthServicio.registrar", () => {
  it("RN-01 y RN-02: registra, guarda el email en minúsculas y devuelve un token", async () => {
    const { servicio, repositorio } = crear();
    const sesion = await servicio.registrar(valido);
    expect(sesion.usuario).toMatchObject({ nombre: "Ana Pérez", email: "ana@correo.com" });
    expect(sesion.token.split(".")).toHaveLength(3);
    expect(repositorio.usuarios[0]?.email).toBe("ana@correo.com");
  });

  it("RN-03: la contraseña se guarda como hash y no vuelve en la respuesta", async () => {
    const { servicio, repositorio } = crear();
    const sesion = await servicio.registrar(valido);
    expect(repositorio.usuarios[0]?.contrasenaHash).not.toContain("contraseña-segura");
    expect(JSON.stringify(sesion)).not.toContain("scrypt");
    expect(sesion.usuario).not.toHaveProperty("contrasenaHash");
  });

  it("RN-02: rechaza un email repetido aunque cambien mayúsculas y espacios", async () => {
    const { servicio } = crear();
    await servicio.registrar(valido);
    await expect(servicio.registrar({ ...valido, email: "  ANA@correo.COM " })).rejects.toBeInstanceOf(ErrorConflicto);
  });

  it.each([
    ["RN-01: nombre de 1 carácter", { ...valido, nombre: "A" }, ["nombre"]],
    ["RN-01: nombre de 61 caracteres", { ...valido, nombre: "a".repeat(61) }, ["nombre"]],
    ["RN-01: email sin arroba", { ...valido, email: "ana.correo.com" }, ["email"]],
    ["RN-01: contraseña de 7 caracteres", { ...valido, contrasena: "1234567" }, ["contrasena"]],
    ["RN-01: contraseña de 201 caracteres", { ...valido, contrasena: "a".repeat(201) }, ["contrasena"]],
    ["RN-01: todo mal a la vez se informa junto", { nombre: "", email: "x", contrasena: "" }, ["contrasena", "email", "nombre"]],
    ["RN-01: campos con tipo equivocado", { nombre: 5, email: ["a@a.com"], contrasena: {} }, ["contrasena", "email", "nombre"]],
  ])("%s", async (_nombre, entrada, esperados) => {
    expect(await campos(crear().servicio.registrar(entrada))).toEqual(esperados);
  });

  it("RN-01: un cuerpo que no es un objeto se rechaza", async () => {
    expect(await campos(crear().servicio.registrar("hola"))).toEqual(["cuerpo"]);
    expect(await campos(crear().servicio.registrar(null))).toEqual(["cuerpo"]);
  });
});

describe("AuthServicio.iniciarSesion", () => {
  it("RN-04: con email (sin importar mayúsculas) y contraseña correctos devuelve token y usuario", async () => {
    const { servicio } = crear();
    const registrada = await servicio.registrar(valido);
    const sesion = await servicio.iniciarSesion({ email: "ANA@correo.com", contrasena: "contraseña-segura" });
    expect(sesion.usuario).toEqual(registrada.usuario);
    expect(sesion.token).toBeTruthy();
  });

  it("RN-04: contraseña incorrecta y email inexistente dan exactamente el mismo error", async () => {
    const { servicio } = crear();
    await servicio.registrar(valido);
    const errores: Error[] = [];
    for (const entrada of [
      { email: "ana@correo.com", contrasena: "equivocada-123" },
      { email: "nadie@correo.com", contrasena: "contraseña-segura" },
    ]) {
      await servicio.iniciarSesion(entrada).catch((e: Error) => errores.push(e));
    }
    expect(errores).toHaveLength(2);
    expect(errores[0]).toBeInstanceOf(ErrorNoAutenticado);
    expect(errores[0]?.message).toBe("El email o la contraseña no son correctos.");
    expect(errores[1]?.message).toBe(errores[0]?.message);
  });

  it("RN-04: pide email y contraseña", async () => {
    expect(await campos(crear().servicio.iniciarSesion({}))).toEqual(["contrasena", "email"]);
  });
});

describe("AuthServicio.usuarioDelToken", () => {
  it("RN-05: devuelve el usuario si el token es válido y falla si no", async () => {
    const { servicio } = crear();
    const { token, usuario } = await servicio.registrar(valido);
    expect(await servicio.usuarioDelToken(token)).toEqual(usuario);
    await expect(servicio.usuarioDelToken("basura")).rejects.toBeInstanceOf(ErrorNoAutenticado);
  });

  it("RN-05: un token válido de un usuario que ya no existe no sirve", async () => {
    const { servicio, repositorio } = crear();
    const { token } = await servicio.registrar(valido);
    repositorio.usuarios.length = 0;
    await expect(servicio.usuarioDelToken(token)).rejects.toBeInstanceOf(ErrorNoAutenticado);
  });
});
