const FORMATO_FECHA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** "YYYY-MM-DD" y además un día que existe en el calendario (rechaza "2026-02-31"). */
export function esFechaISOValida(texto: string): boolean {
  const coincidencia = FORMATO_FECHA_ISO.exec(texto);
  if (!coincidencia) {
    return false;
  }

  const anio = Number(coincidencia[1]);
  const mes = Number(coincidencia[2]);
  const dia = Number(coincidencia[3]);

  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
}
