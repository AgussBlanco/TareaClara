/**
 * Lo mínimo que el resto del programa necesita de una base de datos. Las implementaciones son
 * `crearBaseDePostgres` (producción) y PGlite (tests): el código de repositorios no sabe cuál usa.
 * Todo el SQL usa parámetros ($1, $2...) y nunca texto pegado.
 */
export interface Ejecutor {
  consultar<T extends object = Record<string, unknown>>(sql: string, parametros?: readonly unknown[]): Promise<T[]>;
}

export interface BaseDatos extends Ejecutor {
  /** Ejecuta `trabajo` dentro de una transacción: si lanza un error, no se guarda nada. */
  transaccion<T>(trabajo: (tx: Ejecutor) => Promise<T>): Promise<T>;
  cerrar(): Promise<void>;
}
