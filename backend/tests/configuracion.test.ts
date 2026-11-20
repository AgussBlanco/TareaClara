import { describe, expect, it } from "vitest";
import { cargarConfiguracion } from "../src/config/configuracion";
import { reintentar } from "../src/db/reintentar";

const base = {
  DATABASE_URL: "postgresql://usuario:clave@servidor.ejemplo/base?sslmode=require",
  JWT_SECRET: "una-clave-de-prueba-bastante-larga-0123456789",
};

describe("cargarConfiguracion", () => {
  it("RN-33: lee la configuración de las variables de entorno con valores por defecto", () => {
    const config = cargarConfiguracion(base);
    expect(config).toMatchObject({ produccion: false, puerto: 3000, urlBaseDeDatos: base.DATABASE_URL, origenesPermitidos: [], confiarEnProxy: 0 });
  });

  it("RN-33: falla diciendo qué variable falta", () => {
    expect(() => cargarConfiguracion({})).toThrow(/DATABASE_URL/);
    expect(() => cargarConfiguracion({})).toThrow(/JWT_SECRET/);
  });

  it("RN-33: en producción exige un JWT_SECRET de al menos 32 caracteres", () => {
    const produccion = { ...base, NODE_ENV: "production", CORS_ORIGINS: "https://app.netlify.app" };
    expect(() => cargarConfiguracion({ ...produccion, JWT_SECRET: "corta" })).toThrow(/32 caracteres/);
    expect(cargarConfiguracion({ ...produccion, JWT_SECRET: "a".repeat(32) }).produccion).toBe(true);
  });

  it("RN-33: en producción exige CORS_ORIGINS y confía en un proxy (Render)", () => {
    expect(() => cargarConfiguracion({ ...base, NODE_ENV: "production" })).toThrow(/CORS_ORIGINS/);
    const config = cargarConfiguracion({ ...base, NODE_ENV: "production", JWT_SECRET: "a".repeat(40), CORS_ORIGINS: "https://app.netlify.app/" });
    expect(config.confiarEnProxy).toBe(1);
    expect(config.origenesPermitidos).toEqual(["https://app.netlify.app"]);
  });

  it("acepta varios orígenes separados por coma y rechaza los que no son direcciones", () => {
    const config = cargarConfiguracion({ ...base, CORS_ORIGINS: "http://localhost:5173, https://app.netlify.app" });
    expect(config.origenesPermitidos).toEqual(["http://localhost:5173", "https://app.netlify.app"]);
    expect(() => cargarConfiguracion({ ...base, CORS_ORIGINS: "*" })).toThrow(/CORS_ORIGINS/);
    expect(() => cargarConfiguracion({ ...base, CORS_ORIGINS: "app.netlify.app" })).toThrow(/CORS_ORIGINS/);
  });

  it("valida PORT, TRUST_PROXY y la forma de DATABASE_URL", () => {
    expect(() => cargarConfiguracion({ ...base, PORT: "abc" })).toThrow(/PORT/);
    expect(() => cargarConfiguracion({ ...base, PORT: "70000" })).toThrow(/PORT/);
    expect(() => cargarConfiguracion({ ...base, TRUST_PROXY: "-1" })).toThrow(/TRUST_PROXY/);
    expect(() => cargarConfiguracion({ ...base, DATABASE_URL: "mysql://x" })).toThrow(/DATABASE_URL/);
    expect(cargarConfiguracion({ ...base, PORT: "8080" }).puerto).toBe(8080);
  });

  it("informa todos los problemas juntos", () => {
    expect(() => cargarConfiguracion({ PORT: "x" })).toThrow(/DATABASE_URL[\s\S]*JWT_SECRET[\s\S]*PORT/);
  });

  it("RN-33: el mensaje de error no repite los valores secretos", () => {
    try {
      cargarConfiguracion({ DATABASE_URL: "mysql://usuario:CLAVE-SECRETA@x", JWT_SECRET: "x", NODE_ENV: "production" });
    } catch (error) {
      expect((error as Error).message).not.toContain("CLAVE-SECRETA");
      return;
    }
    throw new Error("Se esperaba un error de configuración");
  });
});

describe("reintentar", () => {
  it("devuelve el resultado en cuanto la operación funciona", async () => {
    let llamadas = 0;
    const resultado = await reintentar(async () => (++llamadas < 3 ? Promise.reject(new Error("aún no")) : "listo"), { intentos: 5, esperaMs: 0 });
    expect(resultado).toBe("listo");
    expect(llamadas).toBe(3);
  });

  it("se rinde con el último error al agotar los intentos", async () => {
    let llamadas = 0;
    await expect(reintentar(async () => Promise.reject(new Error(`falla ${++llamadas}`)), { intentos: 3, esperaMs: 0 })).rejects.toThrow("falla 3");
    expect(llamadas).toBe(3);
  });
});
