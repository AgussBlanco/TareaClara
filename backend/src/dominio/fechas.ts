export const ANIO_MINIMO = 2000;
export const ANIO_MAXIMO = 2100;

const FORMATO_FECHA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * RN-11: "AAAA-MM-DD", un día que existe en el calendario (rechaza "2026-02-31") y con el año entre
 * ANIO_MINIMO y ANIO_MAXIMO (así tampoco hay que lidiar con los años 0 a 99, que JavaScript trata aparte).
 */
export function esFechaISOValida(texto: string): boolean {
  const coincidencia = FORMATO_FECHA_ISO.exec(texto);
  if (!coincidencia) {
    return false;
  }

  const anio = Number(coincidencia[1]);
  const mes = Number(coincidencia[2]);
  const dia = Number(coincidencia[3]);

  if (anio < ANIO_MINIMO || anio > ANIO_MAXIMO) {
    return false;
  }

  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
}
