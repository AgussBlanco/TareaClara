import pg from "pg";
import type { BaseDatos, Ejecutor } from "./baseDatos";

function ejecutorDe(cliente: pg.Pool | pg.PoolClient): Ejecutor {
  return {
    async consultar<T extends object>(sql: string, parametros: readonly unknown[] = []): Promise<T[]> {
      const resultado = await cliente.query(sql, [...parametros]);
      return resultado.rows as T[];
    },
  };
}

/** Conecta con PostgreSQL (por ejemplo Neon). `url` viene de la variable de entorno DATABASE_URL. */
export function crearBaseDePostgres(url: string): BaseDatos {
  const pool = new pg.Pool({ connectionString: url, max: 5, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 15_000 });
  // Un error en una conexión ociosa no debe tirar el proceso: el pool la descarta y abre otra.
  pool.on("error", (error) => {
    console.error("Error en una conexión ociosa de la base de datos:", error.message);
  });

  return {
    ...ejecutorDe(pool),
    async transaccion<T>(trabajo: (tx: Ejecutor) => Promise<T>): Promise<T> {
      const cliente = await pool.connect();
      try {
        await cliente.query("BEGIN");
        const resultado = await trabajo(ejecutorDe(cliente));
        await cliente.query("COMMIT");
        return resultado;
      } catch (error) {
        await cliente.query("ROLLBACK").catch(() => undefined);
        throw error;
      } finally {
        cliente.release();
      }
    },
    async cerrar(): Promise<void> {
      await pool.end();
    },
  };
}
