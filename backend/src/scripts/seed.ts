// Crea dos usuarios de prueba para poder usar la API mientras no exista el registro.
//   npm run seed
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { abrirBaseDeDatos } from "../db/conexion";
import type { UsuarioNuevo } from "../dominio/tipos";
import { UsuarioRepositorioSqlite } from "../repositorios/usuarioRepositorioSqlite";

const rutaBase = process.env.DB_PATH ?? "data/tareaclara.db";

// "!" no es un hash válido: estos usuarios no pueden iniciar sesión, solo sirven para pruebas.
const USUARIOS_DE_PRUEBA: UsuarioNuevo[] = [
  { id: "usuario-ana", nombre: "Ana Pérez", email: "ana@ejemplo.com", contrasenaHash: "!" },
  { id: "usuario-luis", nombre: "Luis Gómez", email: "luis@ejemplo.com", contrasenaHash: "!" },
];

async function main(): Promise<void> {
  if (rutaBase !== ":memory:") {
    mkdirSync(dirname(rutaBase), { recursive: true });
  }
  const db = abrirBaseDeDatos(rutaBase);
  const usuarios = new UsuarioRepositorioSqlite(db);

  for (const usuario of USUARIOS_DE_PRUEBA) {
    if (await usuarios.existePorId(usuario.id)) {
      console.log(`Ya existía: ${usuario.id}`);
    } else {
      await usuarios.crear(usuario);
      console.log(`Creado: ${usuario.id} (${usuario.nombre})`);
    }
  }
  db.close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
