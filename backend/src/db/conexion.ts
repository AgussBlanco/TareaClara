import Database from "better-sqlite3";
import { ESQUEMA_SQL } from "./esquema";

export type BaseDeDatos = Database.Database;

/** Abre (o crea) la base y deja listo el esquema. Usar ":memory:" para pruebas. */
export function abrirBaseDeDatos(ruta: string): BaseDeDatos {
  const db = new Database(ruta);
  db.pragma("foreign_keys = ON"); // SQLite no controla las claves foráneas salvo que se active
  db.exec(ESQUEMA_SQL);
  return db;
}
