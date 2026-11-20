/**
 * Repite una operación si falla, esperando entre intentos. Sirve al arrancar: la base gratuita de Neon se
 * "duerme" por inactividad y tarda unos segundos en despertar con la primera conexión.
 */
export async function reintentar<T>(
  operacion: () => Promise<T>,
  { intentos, esperaMs, alFallar }: { intentos: number; esperaMs: number; alFallar?: (error: Error, intento: number) => void }
): Promise<T> {
  let ultimoError: unknown;
  for (let intento = 1; intento <= intentos; intento += 1) {
    try {
      return await operacion();
    } catch (error) {
      ultimoError = error;
      if (intento < intentos) {
        alFallar?.(error instanceof Error ? error : new Error(String(error)), intento);
        await new Promise((resolver) => setTimeout(resolver, esperaMs));
      }
    }
  }
  throw ultimoError;
}
