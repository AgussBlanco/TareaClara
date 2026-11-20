/**
 * Toda la configuración sale de variables de entorno (RN-33): ningún secreto está en el código ni en el repositorio.
 * Si falta algo o es inválido, el servidor no arranca y el mensaje dice qué variable corregir.
 */
export interface Configuracion {
  produccion: boolean;
  puerto: number;
  urlBaseDeDatos: string;
  jwtSecreto: string;
  /** Orígenes (direcciones del frontend) que pueden llamar a la API desde un navegador. */
  origenesPermitidos: string[];
  /** Cuántos proxies hay delante del servidor (Render pone uno). Hace falta para ver la IP real (RN-06). */
  confiarEnProxy: number;
}

export const JWT_SECRETO_MINIMO_PRODUCCION = 32;

type Entorno = Record<string, string | undefined>;

function normalizarOrigen(origen: string): string {
  return origen.trim().replace(/\/+$/, "");
}

export function cargarConfiguracion(env: Entorno): Configuracion {
  const produccion = env.NODE_ENV === "production";
  const problemas: string[] = [];

  const urlBaseDeDatos = (env.DATABASE_URL ?? "").trim();
  if (urlBaseDeDatos === "") {
    problemas.push("DATABASE_URL: falta la cadena de conexión de PostgreSQL (empieza con postgres:// o postgresql://).");
  } else if (!/^postgres(ql)?:\/\//.test(urlBaseDeDatos)) {
    problemas.push("DATABASE_URL: no parece una cadena de conexión de PostgreSQL (tiene que empezar con postgres:// o postgresql://).");
  }

  const jwtSecreto = env.JWT_SECRET ?? "";
  if (jwtSecreto === "") {
    problemas.push("JWT_SECRET: falta la clave con la que se firman los tokens.");
  } else if (produccion && jwtSecreto.length < JWT_SECRETO_MINIMO_PRODUCCION) {
    problemas.push(`JWT_SECRET: en producción tiene que tener al menos ${JWT_SECRETO_MINIMO_PRODUCCION} caracteres.`);
  }

  const puerto = Number(env.PORT ?? 3000);
  if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) {
    problemas.push(`PORT: "${env.PORT}" no es un puerto válido (1 a 65535).`);
  }

  const origenesPermitidos = (env.CORS_ORIGINS ?? "")
    .split(",")
    .map(normalizarOrigen)
    .filter((origen) => origen !== "");
  for (const origen of origenesPermitidos) {
    if (!/^https?:\/\/[^/\s]+$/.test(origen)) {
      problemas.push(`CORS_ORIGINS: "${origen}" no es un origen válido (por ejemplo https://tareaclara.netlify.app).`);
    }
  }
  if (produccion && origenesPermitidos.length === 0) {
    problemas.push("CORS_ORIGINS: en producción hace falta la dirección del frontend (por ejemplo https://tareaclara.netlify.app).");
  }

  const confiarEnProxy = env.TRUST_PROXY === undefined ? (produccion ? 1 : 0) : Number(env.TRUST_PROXY);
  if (!Number.isInteger(confiarEnProxy) || confiarEnProxy < 0 || confiarEnProxy > 5) {
    problemas.push(`TRUST_PROXY: "${env.TRUST_PROXY}" no es válido (un número entero de 0 a 5).`);
  }

  if (problemas.length > 0) {
    throw new Error(`Configuración inválida:\n- ${problemas.join("\n- ")}`);
  }
  return { produccion, puerto, urlBaseDeDatos, jwtSecreto, origenesPermitidos, confiarEnProxy };
}
