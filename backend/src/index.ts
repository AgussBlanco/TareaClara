import { componer } from "./app";
import { cargarConfiguracion } from "./config/configuracion";
import { ejecutarMigraciones } from "./db/migraciones";
import { crearBaseDePostgres } from "./db/postgres";
import { reintentar } from "./db/reintentar";

async function main(): Promise<void> {
  const config = cargarConfiguracion(process.env);
  const db = crearBaseDePostgres(config.urlBaseDeDatos);

  // La base gratuita puede estar "dormida": se reintenta unos segundos antes de rendirse.
  const aplicadas = await reintentar(() => ejecutarMigraciones(db), {
    intentos: 6,
    esperaMs: 5000,
    alFallar: (error, intento) => console.warn(`La base de datos todavía no responde (intento ${intento}): ${error.message}`),
  });
  console.log(aplicadas.length > 0 ? `Migraciones aplicadas: ${aplicadas.join(", ")}` : "Base de datos al día.");

  const app = componer(db, {
    jwtSecreto: config.jwtSecreto,
    origenesPermitidos: config.origenesPermitidos,
    confiarEnProxy: config.confiarEnProxy,
  });
  const servidor = app.listen(config.puerto, () => {
    console.log(`API de TareaClara escuchando en el puerto ${config.puerto}`);
  });

  // Render avisa con SIGTERM antes de apagar el servicio: se terminan las peticiones en curso y se cierra la base.
  const apagar = (): void => {
    console.log("Apagando...");
    servidor.close(() => {
      void db.cerrar().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGTERM", apagar);
  process.on("SIGINT", apagar);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
