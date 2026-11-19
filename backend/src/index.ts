import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { componer } from "./app";
import { abrirBaseDeDatos } from "./db/conexion";

const puerto = Number(process.env.PORT ?? 3000);
const rutaBase = process.env.DB_PATH ?? "data/tareaclara.db";

if (rutaBase !== ":memory:") {
  mkdirSync(dirname(rutaBase), { recursive: true });
}

const app = componer(abrirBaseDeDatos(rutaBase));

app.listen(puerto, () => {
  console.log(`API de TareaClara escuchando en http://localhost:${puerto} (base: ${rutaBase})`);
});
