import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { BaseDatos } from "./baseDatos";

// Funciona igual desde src/db (desarrollo) y desde dist/db (producción): ambos están dos carpetas
// debajo de backend/, donde vive migrations/.
export const CARPETA_MIGRACIONES = resolve(__dirname, "../../migrations");

// Número cualquiera pero fijo: evita que dos instancias que arrancan a la vez apliquen lo mismo.
const CLAVE_BLOQUEO = 74_231_001;

/**
 * Aplica, en orden, las migraciones que todavía no se aplicaron. Cada archivo `NNN_nombre.sql` se ejecuta
 * una sola vez, dentro de una transacción, y queda anotado en la tabla `migraciones`.
 * Las migraciones ya aplicadas no se editan: para cambiar la base se agrega una nueva.
 * Devuelve los nombres de las que se aplicaron en esta llamada.
 */
export async function ejecutarMigraciones(db: BaseDatos, carpeta: string = CARPETA_MIGRACIONES): Promise<string[]> {
  const archivos = readdirSync(carpeta)
    .filter((nombre) => /^\d{3}_.+\.sql$/.test(nombre))
    .sort();

  return db.transaccion(async (tx) => {
    await tx.consultar("SELECT pg_advisory_xact_lock($1)", [CLAVE_BLOQUEO]);
    await tx.consultar(
      "CREATE TABLE IF NOT EXISTS migraciones (nombre TEXT PRIMARY KEY, aplicada_en TIMESTAMPTZ NOT NULL DEFAULT now())"
    );
    const hechas = new Set((await tx.consultar<{ nombre: string }>("SELECT nombre FROM migraciones")).map((f) => f.nombre));

    const aplicadas: string[] = [];
    for (const archivo of archivos) {
      if (hechas.has(archivo)) {
        continue;
      }
      await tx.consultar(readFileSync(join(carpeta, archivo), "utf8"));
      await tx.consultar("INSERT INTO migraciones (nombre) VALUES ($1)", [archivo]);
      aplicadas.push(archivo);
    }
    return aplicadas;
  });
}
