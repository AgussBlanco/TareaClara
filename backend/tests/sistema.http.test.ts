import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { BaseDatos } from "../src/db/baseDatos";
import { crearBaseMigrada } from "./ayudas/basePrueba";
import { iniciarServidor, ORIGEN_PERMITIDO, type ServidorDePrueba } from "./ayudas/servidorPrueba";

let db: BaseDatos;
let servidor: ServidorDePrueba;

beforeAll(async () => {
  db = await crearBaseMigrada();
  servidor = await iniciarServidor(db);
});
afterAll(async () => {
  await servidor.cerrar();
  await db.cerrar();
});

describe("CORS", () => {
  it("RN-33: el origen del frontend puede leer las respuestas", async () => {
    const respuesta = await fetch(`${servidor.base}/api/salud`, { headers: { Origin: ORIGEN_PERMITIDO } });
    expect(respuesta.headers.get("access-control-allow-origin")).toBe(ORIGEN_PERMITIDO);
  });

  it("RN-33: otro origen no recibe permiso", async () => {
    const respuesta = await fetch(`${servidor.base}/api/salud`, { headers: { Origin: "https://sitio-malicioso.com" } });
    expect(respuesta.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("responde la verificación previa del navegador (preflight) con los métodos y encabezados permitidos", async () => {
    const respuesta = await fetch(`${servidor.base}/api/tareas`, {
      method: "OPTIONS",
      headers: { Origin: ORIGEN_PERMITIDO, "Access-Control-Request-Method": "PATCH", "Access-Control-Request-Headers": "authorization,content-type" },
    });
    expect(respuesta.status).toBe(204);
    expect(respuesta.headers.get("access-control-allow-origin")).toBe(ORIGEN_PERMITIDO);
    expect(respuesta.headers.get("access-control-allow-methods")).toContain("PATCH");
    expect(respuesta.headers.get("access-control-allow-headers")?.toLowerCase()).toContain("authorization");
  });
});

describe("GET /api/salud", () => {
  it("200 cuando el servidor y la base responden", async () => {
    const respuesta = await fetch(`${servidor.base}/api/salud`);
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ estado: "ok" });
  });

  it("503 si la base no responde, sin detallar el error al cliente", async () => {
    const rota = await crearBaseMigrada();
    const servidorSinBase = await iniciarServidor(rota);
    await rota.cerrar();
    try {
      const respuesta = await fetch(`${servidorSinBase.base}/api/salud`);
      expect(respuesta.status).toBe(503);
      expect((await respuesta.json()).error.codigo).toBe("BASE_NO_DISPONIBLE");
    } finally {
      await servidorSinBase.cerrar();
    }
  });
});
