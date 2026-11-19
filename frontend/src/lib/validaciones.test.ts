import { describe, expect, it } from "vitest";
import {
  esUrlHttp,
  interpretarNota,
  validarBorradorTarea,
  validarLogin,
  validarMaterial,
  validarRegistro,
  type BorradorTarea,
} from "./validaciones";

const borradorValido: BorradorTarea = {
  titulo: "  TP de funciones ",
  descripcion: "",
  materia: " Matemática ",
  fechaLimite: "2026-10-10",
  prioridad: "Alta",
  nota: "",
};

describe("interpretarNota", () => {
  it.each([
    ["", null],
    ["   ", null],
    ["0", 0],
    ["8", 8],
    ["8,5", 8.5],
    ["8.25", 8.25],
    ["10", 10],
  ])("'%s' -> %s", (texto, esperado) => {
    expect(interpretarNota(texto)).toBe(esperado);
  });

  it.each(["11", "10.01", "-1", "abc", "7.123", "1e1", "8,5,2"])("'%s' es inválida", (texto) => {
    expect(interpretarNota(texto)).toBe("invalida");
  });
});

describe("validarBorradorTarea", () => {
  it("devuelve los datos limpios (sin espacios sobrantes) cuando todo está bien", () => {
    const r = validarBorradorTarea(borradorValido);
    expect(r).toEqual({
      ok: true,
      datos: {
        titulo: "TP de funciones",
        descripcion: "",
        materia: "Matemática",
        fechaLimite: "2026-10-10",
        prioridad: "Alta",
        nota: null,
      },
    });
  });

  it("convierte la nota escrita con coma", () => {
    const r = validarBorradorTarea({ ...borradorValido, nota: "7,5" });
    expect(r.ok && r.datos.nota).toBe(7.5);
  });

  it("acepta una fecha límite en el pasado (la tarea figurará como vencida)", () => {
    expect(validarBorradorTarea({ ...borradorValido, fechaLimite: "2020-01-01" }).ok).toBe(true);
  });

  it("marca todos los campos obligatorios vacíos a la vez", () => {
    const r = validarBorradorTarea({ ...borradorValido, titulo: "  ", materia: "", fechaLimite: "" });
    expect(r.ok).toBe(false);
    expect(!r.ok && Object.keys(r.errores).sort()).toEqual(["fechaLimite", "materia", "titulo"]);
  });

  it("rechaza título demasiado largo, fecha inexistente, prioridad inventada y nota fuera de rango", () => {
    const r = validarBorradorTarea({
      ...borradorValido,
      titulo: "x".repeat(101),
      fechaLimite: "2026-02-31",
      prioridad: "Urgente",
      nota: "11",
    });
    expect(!r.ok && Object.keys(r.errores).sort()).toEqual(["fechaLimite", "nota", "prioridad", "titulo"]);
  });
});

describe("esUrlHttp y validarMaterial", () => {
  it.each(["https://ejemplo.com/guia", "http://ejemplo.com"])("acepta %s", (url) => {
    expect(esUrlHttp(url)).toBe(true);
  });

  it.each(["javascript:alert(1)", "ftp://ejemplo.com", "ejemplo.com", "", "data:text/html,hola"])(
    "rechaza %s",
    (url) => {
      expect(esUrlHttp(url)).toBe(false);
    }
  );

  it("acepta un enlace válido y un apunte de texto", () => {
    expect(validarMaterial({ titulo: "Guía", tipo: "link", contenido: " https://ejemplo.com " })).toEqual({
      ok: true,
      datos: { titulo: "Guía", tipo: "link", contenido: "https://ejemplo.com" },
    });
    expect(validarMaterial({ titulo: "Resumen", tipo: "texto", contenido: "La derivada es..." }).ok).toBe(true);
  });

  it("rechaza enlaces peligrosos, vacíos y tipos desconocidos", () => {
    expect(validarMaterial({ titulo: "X", tipo: "link", contenido: "javascript:alert(1)" }).ok).toBe(false);
    expect(validarMaterial({ titulo: "", tipo: "texto", contenido: "algo" }).ok).toBe(false);
    expect(validarMaterial({ titulo: "X", tipo: "texto", contenido: " " }).ok).toBe(false);
    expect(validarMaterial({ titulo: "X", tipo: "video", contenido: "algo" }).ok).toBe(false);
  });
});

describe("validarRegistro y validarLogin", () => {
  it("normaliza el email y recorta el nombre", () => {
    const r = validarRegistro({ nombre: " Ana ", email: " ANA@Correo.com ", contrasena: "secreta1" });
    expect(r).toEqual({ ok: true, datos: { nombre: "Ana", email: "ana@correo.com", contrasena: "secreta1" } });
  });

  it("rechaza nombre corto, email inválido y contraseña corta", () => {
    const r = validarRegistro({ nombre: "A", email: "ana@", contrasena: "123" });
    expect(!r.ok && Object.keys(r.errores).sort()).toEqual(["contrasena", "email", "nombre"]);
  });

  it("el login exige email y contraseña", () => {
    const r = validarLogin({ email: " ", contrasena: "" });
    expect(!r.ok && Object.keys(r.errores).sort()).toEqual(["contrasena", "email"]);
  });
});
