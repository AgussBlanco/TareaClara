import { describe, expect, it } from "vitest";
import { leerConfiguracion } from "./config";

describe("leerConfiguracion", () => {
  it("quita la barra final de VITE_API_URL", () => {
    expect(leerConfiguracion({ VITE_API_URL: "https://api.ejemplo.com/" })).toEqual({
      ok: true,
      apiUrl: "https://api.ejemplo.com",
    });
  });

  it("sin variable: en desarrollo usa localhost:3000", () => {
    expect(leerConfiguracion({ DEV: true })).toEqual({ ok: true, apiUrl: "http://localhost:3000" });
  });

  it("sin variable en producción es un error de configuración", () => {
    const r = leerConfiguracion({ VITE_API_URL: "  ", DEV: false });
    expect(r.ok).toBe(false);
  });

  it("rechaza direcciones inválidas o con otro protocolo", () => {
    expect(leerConfiguracion({ VITE_API_URL: "api.ejemplo.com" }).ok).toBe(false);
    expect(leerConfiguracion({ VITE_API_URL: "ftp://api.ejemplo.com" }).ok).toBe(false);
  });
});
