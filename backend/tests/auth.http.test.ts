import jwt from "jsonwebtoken";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { BaseDatos } from "../src/db/baseDatos";
import { crearBaseMigrada } from "./ayudas/basePrueba";
import { crearCliente, iniciarServidor, registrarUsuario, SECRETO_DE_PRUEBA, type Cliente, type ServidorDePrueba } from "./ayudas/servidorPrueba";

// Pruebas de punta a punta: petición HTTP real -> controlador -> servicio -> repositorio -> PostgreSQL.

let db: BaseDatos;
let servidor: ServidorDePrueba;
let api: Cliente;

beforeAll(async () => {
  db = await crearBaseMigrada();
  servidor = await iniciarServidor(db);
  api = crearCliente(servidor.base);
});
afterAll(async () => {
  await servidor.cerrar();
  await db.cerrar();
});
beforeEach(async () => {
  await db.consultar("TRUNCATE usuarios CASCADE");
});

const datos = { nombre: "Ana Pérez", email: "ana@correo.com", contrasena: "contraseña-segura" };

describe("POST /api/auth/registro", () => {
  it("RN-01: 201 con token y usuario, sin hash de contraseña", async () => {
    const { estado, cuerpo } = await api.post("/api/auth/registro", datos);
    expect(estado).toBe(201);
    expect(cuerpo.token.split(".")).toHaveLength(3);
    expect(cuerpo.usuario).toMatchObject({ nombre: "Ana Pérez", email: "ana@correo.com" });
    expect(JSON.stringify(cuerpo)).not.toMatch(/scrypt|contrasena/i);
  });

  it("RN-03: la contraseña queda guardada como hash en la base", async () => {
    await api.post("/api/auth/registro", datos);
    const [fila] = await db.consultar<{ contrasena_hash: string }>("SELECT contrasena_hash FROM usuarios");
    expect(fila?.contrasena_hash.startsWith("scrypt$")).toBe(true);
    expect(fila?.contrasena_hash).not.toContain("contraseña-segura");
  });

  it("RN-02: 409 si el email ya existe, aunque cambien las mayúsculas", async () => {
    await api.post("/api/auth/registro", datos);
    const { estado, cuerpo } = await api.post("/api/auth/registro", { ...datos, email: "ANA@Correo.com" });
    expect(estado).toBe(409);
    expect(cuerpo.error.codigo).toBe("CONFLICTO");
  });

  it("RN-01: 400 con el detalle de cada campo inválido", async () => {
    const { estado, cuerpo } = await api.post("/api/auth/registro", { nombre: "", email: "x", contrasena: "123" });
    expect(estado).toBe(400);
    expect(cuerpo.error.codigo).toBe("VALIDACION");
    expect(cuerpo.error.detalles.map((d: { campo: string }) => d.campo).sort()).toEqual(["contrasena", "email", "nombre"]);
  });

  it("RN-31: 400 con formato de error común si el JSON está mal formado", async () => {
    const respuesta = await fetch(`${servidor.base}/api/auth/registro`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{esto no es json",
    });
    expect(respuesta.status).toBe(400);
    expect((await respuesta.json()).error.codigo).toBe("JSON_INVALIDO");
  });

  it("RN-30: 413 si el cuerpo supera los 100 KB", async () => {
    const { estado, cuerpo } = await api.post("/api/auth/registro", { ...datos, nombre: "a".repeat(150_000) });
    expect(estado).toBe(413);
    expect(cuerpo.error.codigo).toBe("CUERPO_MUY_GRANDE");
  });
});

describe("POST /api/auth/login", () => {
  it("RN-04: 200 con token si las credenciales son correctas", async () => {
    await api.post("/api/auth/registro", datos);
    const { estado, cuerpo } = await api.post("/api/auth/login", { email: "ANA@correo.com", contrasena: datos.contrasena });
    expect(estado).toBe(200);
    expect(cuerpo.usuario.email).toBe("ana@correo.com");
    expect(cuerpo.token).toBeTruthy();
  });

  it("RN-04: 401 con el mismo mensaje si falla el email o la contraseña", async () => {
    await api.post("/api/auth/registro", datos);
    const mala = await api.post("/api/auth/login", { email: datos.email, contrasena: "otra-contraseña" });
    const inexistente = await api.post("/api/auth/login", { email: "nadie@correo.com", contrasena: datos.contrasena });
    expect(mala.estado).toBe(401);
    expect(inexistente.estado).toBe(401);
    expect(mala.cuerpo).toEqual(inexistente.cuerpo);
    expect(mala.cuerpo.error.mensaje).toBe("El email o la contraseña no son correctos.");
  });

  it("RN-01: 400 si faltan campos", async () => {
    const { estado, cuerpo } = await api.post("/api/auth/login", {});
    expect(estado).toBe(400);
    expect(cuerpo.error.detalles).toHaveLength(2);
  });
});

describe("autenticación de las rutas protegidas", () => {
  it("RN-05: GET /api/auth/yo devuelve el usuario del token", async () => {
    const { token, id } = await registrarUsuario(api);
    const { estado, cuerpo } = await api.get("/api/auth/yo", token);
    expect(estado).toBe(200);
    expect(cuerpo.id).toBe(id);
    expect(cuerpo).not.toHaveProperty("contrasenaHash");
  });

  it("RN-05: 401 sin token, con token basura, con token vencido y con token de otra clave", async () => {
    const { id } = await registrarUsuario(api);
    const vencido = jwt.sign({}, SECRETO_DE_PRUEBA, { subject: id, expiresIn: -10 });
    const deOtraClave = jwt.sign({}, "otra-clave-completamente-distinta-0123456789", { subject: id, expiresIn: "7d" });
    for (const token of [null, "basura", vencido, deOtraClave]) {
      const lista = await api.get("/api/tareas", token);
      expect(lista.estado).toBe(401);
      expect(lista.cuerpo.error.codigo).toBe("NO_AUTENTICADO");
    }
    expect((await api.get("/api/auth/yo", "basura")).estado).toBe(401);
  });

  it("RN-05: un encabezado sin la palabra Bearer no sirve", async () => {
    const { token } = await registrarUsuario(api);
    const respuesta = await fetch(`${servidor.base}/api/tareas`, { headers: { Authorization: token } });
    expect(respuesta.status).toBe(401);
  });

  it("RN-05: un token válido de un usuario que ya no existe da 401", async () => {
    const { token, id } = await registrarUsuario(api);
    await db.consultar("DELETE FROM usuarios WHERE id = $1", [id]);
    expect((await api.get("/api/tareas", token)).estado).toBe(401);
  });

  it("RN-31: una ruta que no existe responde 404 con el formato de error común", async () => {
    const { estado, cuerpo } = await api.get("/api/no-existe");
    expect(estado).toBe(404);
    expect(cuerpo.error.codigo).toBe("NO_ENCONTRADO");
  });

  it("GET /api/salud responde sin token y no revela el framework", async () => {
    const respuesta = await fetch(`${servidor.base}/api/salud`);
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("x-powered-by")).toBeNull();
  });
});

describe("límite de intentos", () => {
  it("RN-06: pasado el límite, registro y login responden 429; las demás rutas no se ven afectadas", async () => {
    const limitado = await iniciarServidor(db, 3);
    try {
      const cliente = crearCliente(limitado.base);
      const { token } = await registrarUsuario(cliente); // intento 1
      await cliente.post("/api/auth/login", { email: "x@x.com", contrasena: "mala-contraseña" }); // 2
      await cliente.post("/api/auth/login", { email: "x@x.com", contrasena: "mala-contraseña" }); // 3
      const cuarto = await cliente.post("/api/auth/login", { email: "x@x.com", contrasena: "mala-contraseña" });
      expect(cuarto.estado).toBe(429);
      expect(cuarto.cuerpo.error.codigo).toBe("DEMASIADOS_INTENTOS");
      expect((await cliente.get("/api/tareas", token)).estado).toBe(200);
    } finally {
      await limitado.cerrar();
    }
  });
});
