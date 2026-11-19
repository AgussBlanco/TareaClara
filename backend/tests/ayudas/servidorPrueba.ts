import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { componer } from "../../src/app";
import type { BaseDatos } from "../../src/db/baseDatos";

export const SECRETO_DE_PRUEBA = "secreto-solo-para-tests-0123456789abcdef";

export interface ServidorDePrueba {
  base: string;
  cerrar(): Promise<void>;
}

/** Levanta la API de verdad (puerto libre al azar) para probarla con peticiones HTTP reales. */
export async function iniciarServidor(db: BaseDatos, limiteAuth = 1000): Promise<ServidorDePrueba> {
  const servidor: Server = componer(db, { jwtSecreto: SECRETO_DE_PRUEBA, limiteAuth }).listen(0);
  await once(servidor, "listening");
  return {
    base: `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`,
    async cerrar() {
      servidor.closeAllConnections();
      await new Promise<void>((resolver) => servidor.close(() => resolver()));
    },
  };
}

export interface Respuesta {
  estado: number;
  cuerpo: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  encabezados: Headers;
}

/** Cliente mínimo para los tests: manda JSON, devuelve estado y cuerpo ya leído. */
export function crearCliente(base: string) {
  async function pedir(metodo: string, ruta: string, cuerpo?: unknown, token?: string | null): Promise<Respuesta> {
    const respuesta = await fetch(`${base}${ruta}`, {
      method: metodo,
      headers: {
        ...(cuerpo !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    });
    const texto = await respuesta.text();
    return { estado: respuesta.status, cuerpo: texto ? JSON.parse(texto) : null, encabezados: respuesta.headers };
  }
  return {
    pedir,
    get: (ruta: string, token?: string | null) => pedir("GET", ruta, undefined, token),
    post: (ruta: string, cuerpo: unknown, token?: string | null) => pedir("POST", ruta, cuerpo, token),
    put: (ruta: string, cuerpo: unknown, token?: string | null) => pedir("PUT", ruta, cuerpo, token),
    patch: (ruta: string, cuerpo: unknown, token?: string | null) => pedir("PATCH", ruta, cuerpo, token),
    borrar: (ruta: string, token?: string | null) => pedir("DELETE", ruta, undefined, token),
  };
}

export type Cliente = ReturnType<typeof crearCliente>;

let secuencia = 0;
/** Registra un usuario nuevo y devuelve su token y su id. */
export async function registrarUsuario(cliente: Cliente, nombre = "Ana"): Promise<{ token: string; id: string; email: string }> {
  secuencia += 1;
  const email = `${nombre.toLowerCase()}${secuencia}@correo.com`;
  const { estado, cuerpo } = await cliente.post("/api/auth/registro", { nombre, email, contrasena: "contraseña-segura" });
  if (estado !== 201) {
    throw new Error(`No se pudo registrar el usuario de prueba: ${estado} ${JSON.stringify(cuerpo)}`);
  }
  return { token: cuerpo.token, id: cuerpo.usuario.id, email };
}
