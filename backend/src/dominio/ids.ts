const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Un id que no tiene forma de UUID no puede existir: se trata como "no encontrado" sin molestar a la base. */
export function esUuid(valor: string): boolean {
  return FORMATO_UUID.test(valor);
}
