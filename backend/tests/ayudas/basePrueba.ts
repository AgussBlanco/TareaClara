import { PGlite } from "@electric-sql/pglite";
import type { BaseDatos, Ejecutor } from "../../src/db/baseDatos";
import { ejecutarMigraciones } from "../../src/db/migraciones";

/**
 * Base de datos PostgreSQL real, en memoria y dentro del proceso (PGlite), para los tests.
 * Implementa la misma interfaz que usa producción, así los repositorios se prueban sobre PostgreSQL de verdad.
 */
export function crearBaseDePrueba(): BaseDatos {
  const pglite = new PGlite();
  const ejecutorDe = (cliente: Pick<PGlite, "query">): Ejecutor => ({
    async consultar<T extends object>(sql: string, parametros: readonly unknown[] = []): Promise<T[]> {
      // PGlite solo acepta varias sentencias juntas sin parámetros: las migraciones usan ese camino.
      if (parametros.length === 0 && sql.includes(";")) {
        const resultados = await (cliente as PGlite).exec(sql);
        return (resultados.at(-1)?.rows ?? []) as T[];
      }
      const resultado = await cliente.query(sql, [...parametros]);
      return resultado.rows as T[];
    },
  });

  return {
    ...ejecutorDe(pglite),
    transaccion: (trabajo) =>
      pglite.transaction((tx) => trabajo(ejecutorDe(tx as unknown as Pick<PGlite, "query">))),
    cerrar: () => pglite.close(),
  };
}

export async function crearBaseMigrada(): Promise<BaseDatos> {
  const db = crearBaseDePrueba();
  await ejecutarMigraciones(db);
  return db;
}
