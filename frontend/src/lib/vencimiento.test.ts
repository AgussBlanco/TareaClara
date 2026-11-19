// Tests unitarios del módulo de vencimiento (vienen de la Mini actividad de la Clase 10).
import { describe, expect, it } from "vitest";
import {
  calcularDiasRestantes,
  calcularEstadoVencimiento,
  parsearFechaISO,
  type TareaConFecha,
} from "./vencimiento";
import { describirVencimiento, formatearFechaLimite } from "./textosVencimiento";

describe("parsearFechaISO", () => {
  it("interpreta 'YYYY-MM-DD' como día calendario local (caso correcto)", () => {
    const fecha = parsearFechaISO("2026-10-05");
    expect(fecha?.getFullYear()).toBe(2026);
    expect(fecha?.getMonth()).toBe(9);
    expect(fecha?.getDate()).toBe(5);
  });

  it.each(["", "2026-1-5", "05/10/2026", "2026-13-01", "2026-02-31", "2027-02-29"])(
    "devuelve null para '%s' (dato inválido)",
    (entrada) => {
      expect(parsearFechaISO(entrada)).toBeNull();
    }
  );

  it("acepta el 29 de febrero de un año bisiesto (caso límite)", () => {
    expect(parsearFechaISO("2028-02-29")).not.toBeNull();
  });
});

describe("calcularDiasRestantes", () => {
  it("da 0 el mismo día sin importar la hora (caso límite)", () => {
    expect(calcularDiasRestantes("2026-10-02", new Date(2026, 9, 2, 0, 0))).toBe(0);
    expect(calcularDiasRestantes("2026-10-02", new Date(2026, 9, 2, 23, 59))).toBe(0);
  });

  it("da positivo hacia el futuro y negativo hacia el pasado (caso correcto)", () => {
    const hoy = new Date(2026, 9, 2, 18, 0);
    expect(calcularDiasRestantes("2026-10-03", hoy)).toBe(1);
    expect(calcularDiasRestantes("2026-09-29", hoy)).toBe(-3);
  });

  it("cuenta bien al cambiar de mes y de año (caso límite)", () => {
    expect(calcularDiasRestantes("2026-11-01", new Date(2026, 9, 31, 22, 0))).toBe(1);
    expect(calcularDiasRestantes("2027-01-01", new Date(2026, 11, 31, 22, 0))).toBe(1);
  });

  it("devuelve null si la fecha límite es inválida (dato inválido)", () => {
    expect(calcularDiasRestantes("no-es-fecha", new Date(2026, 9, 2))).toBeNull();
  });
});

describe("calcularEstadoVencimiento", () => {
  const base: TareaConFecha = { estado: "No completada", prioridad: "Alta", fechaLimite: "2026-10-04" };
  const hoy = new Date(2026, 9, 2, 18, 0);

  it("devuelve nivel y días restantes (caso correcto)", () => {
    expect(calcularEstadoVencimiento(base, hoy)).toEqual({ nivel: "critico", diasRestantes: 2 });
  });

  it("una tarea próxima con prioridad no alta queda en 'atencion'", () => {
    expect(calcularEstadoVencimiento({ ...base, prioridad: "Media" }, hoy).nivel).toBe("atencion");
  });

  it("una tarea completada nunca se marca, aunque esté vencida", () => {
    const vencida: TareaConFecha = { ...base, estado: "Completada", fechaLimite: "2026-09-01" };
    expect(calcularEstadoVencimiento(vencida, hoy).nivel).toBe("completada");
  });

  it("no muta la tarea recibida (inmutabilidad)", () => {
    const congelada = Object.freeze({ ...base });
    expect(() => calcularEstadoVencimiento(congelada, hoy)).not.toThrow();
    expect(congelada).toEqual(base);
  });
});

describe("textos de presentación", () => {
  it("describe singular y plural de días", () => {
    expect(describirVencimiento({ nivel: "atencion", diasRestantes: 1 })).toBe("Vence en 1 día");
    expect(describirVencimiento({ nivel: "atencion", diasRestantes: 2 })).toBe("Vence en 2 días");
  });

  it("describe vencida, hoy, lejana y sin fecha", () => {
    expect(describirVencimiento({ nivel: "critico", diasRestantes: -3 })).toBe("Vencida hace 3 días");
    expect(describirVencimiento({ nivel: "critico", diasRestantes: 0 })).toBe("Vence hoy");
    expect(describirVencimiento({ nivel: "normal", diasRestantes: 10 })).toBe("Faltan 10 días");
    expect(describirVencimiento({ nivel: "normal", diasRestantes: null })).toBe("Sin fecha límite");
  });

  it("formatea la fecha como DD/MM/AAAA y devuelve vacío si es inválida", () => {
    expect(formatearFechaLimite("2026-10-05")).toBe("05/10/2026");
    expect(formatearFechaLimite("")).toBe("");
  });
});
