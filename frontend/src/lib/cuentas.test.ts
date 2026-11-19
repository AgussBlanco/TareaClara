import { describe, expect, it } from "vitest";
import { hashearContrasena, verificarContrasena } from "./auth";
import { autenticar, crearUsuario } from "./cuentas";

describe("hash de contraseñas", () => {
  it("guarda el algoritmo, las iteraciones, una sal y el hash; nunca la contraseña", async () => {
    const guardado = await hashearContrasena("secreta123");
    const partes = guardado.split("$");
    expect(partes).toHaveLength(4);
    expect(partes[0]).toBe("pbkdf2-sha256");
    expect(Number(partes[1])).toBeGreaterThanOrEqual(100_000);
    expect(guardado).not.toContain("secreta123");
  });

  it("la misma contraseña produce hashes distintos (sal aleatoria) pero ambos verifican", async () => {
    const a = await hashearContrasena("secreta123");
    const b = await hashearContrasena("secreta123");
    expect(a).not.toBe(b);
    expect(await verificarContrasena("secreta123", a)).toBe(true);
    expect(await verificarContrasena("secreta123", b)).toBe(true);
  });

  it("rechaza una contraseña incorrecta y datos guardados mal formados", async () => {
    const guardado = await hashearContrasena("secreta123");
    expect(await verificarContrasena("otra-cosa", guardado)).toBe(false);
    expect(await verificarContrasena("secreta123", "texto-suelto")).toBe(false);
    expect(await verificarContrasena("secreta123", "pbkdf2-sha256$abc$x$y")).toBe(false);
    expect(await verificarContrasena("secreta123", "")).toBe(false);
  });
});

describe("crearUsuario y autenticar", () => {
  it("crea el usuario con email normalizado y sin la contraseña en claro", async () => {
    const r = await crearUsuario([], { nombre: " Ana ", email: " ANA@Correo.com", contrasena: "secreta123" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.usuario.nombre).toBe("Ana");
      expect(r.usuario.email).toBe("ana@correo.com");
      expect(JSON.stringify(r.usuario)).not.toContain("secreta123");
    }
  });

  it("no permite repetir el email, aunque cambien mayúsculas", async () => {
    const primero = await crearUsuario([], { nombre: "Ana", email: "ana@correo.com", contrasena: "secreta123" });
    if (!primero.ok) throw new Error("no se pudo crear el usuario de prueba");
    const repetido = await crearUsuario([primero.usuario], {
      nombre: "Otra Ana",
      email: "ANA@correo.com",
      contrasena: "secreta456",
    });
    expect(repetido.ok).toBe(false);
    expect(!repetido.ok && repetido.errores.email).toBe("Ya existe una cuenta con ese email.");
  });

  it("devuelve los errores de validación del registro", async () => {
    const r = await crearUsuario([], { nombre: "A", email: "mal", contrasena: "1" });
    expect(!r.ok && Object.keys(r.errores).sort()).toEqual(["contrasena", "email", "nombre"]);
  });

  it("inicia sesión con las credenciales correctas", async () => {
    const creado = await crearUsuario([], { nombre: "Ana", email: "ana@correo.com", contrasena: "secreta123" });
    if (!creado.ok) throw new Error("no se pudo crear el usuario de prueba");
    const r = await autenticar([creado.usuario], { email: "ANA@correo.com", contrasena: "secreta123" });
    expect(r.ok && r.usuario.id).toBe(creado.usuario.id);
  });

  it("da el mismo mensaje si falla el email o la contraseña", async () => {
    const creado = await crearUsuario([], { nombre: "Ana", email: "ana@correo.com", contrasena: "secreta123" });
    if (!creado.ok) throw new Error("no se pudo crear el usuario de prueba");
    const malaClave = await autenticar([creado.usuario], { email: "ana@correo.com", contrasena: "incorrecta" });
    const malEmail = await autenticar([creado.usuario], { email: "otra@correo.com", contrasena: "secreta123" });
    expect(!malaClave.ok && malaClave.errores.general).toBe("El email o la contraseña no son correctos.");
    expect(!malEmail.ok && malEmail.errores.general).toBe("El email o la contraseña no son correctos.");
  });
});
