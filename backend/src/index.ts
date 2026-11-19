import { componer } from "./app";
import { crearBaseDePostgres } from "./db/postgres";
import { ejecutarMigraciones } from "./db/migraciones";

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Falta la variable DATABASE_URL (cadena de conexión de PostgreSQL).");
  }
  const puerto = Number(process.env.PORT ?? 3000);
  const jwtSecreto = process.env.JWT_SECRET;
  if (!jwtSecreto) {
    throw new Error("Falta la variable JWT_SECRET.");
  }

  const db = crearBaseDePostgres(url);
  const aplicadas = await ejecutarMigraciones(db);
  console.log(aplicadas.length > 0 ? `Migraciones aplicadas: ${aplicadas.join(", ")}` : "Base de datos al día.");

  componer(db, { jwtSecreto }).listen(puerto, () => {
    console.log(`API de TareaClara escuchando en el puerto ${puerto}`);
  });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
