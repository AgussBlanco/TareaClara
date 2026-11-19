export interface DetalleValidacion {
  campo: string;
  mensaje: string;
}

/** Los datos enviados no cumplen las reglas de negocio: se responde 400. */
export class ErrorValidacion extends Error {
  readonly detalles: DetalleValidacion[];

  constructor(detalles: DetalleValidacion[]) {
    super("Los datos enviados no son válidos.");
    this.name = "ErrorValidacion";
    this.detalles = detalles;
  }
}

/** No se pudo saber quién hace la petición: se responde 401. */
export class ErrorNoAutenticado extends Error {
  constructor() {
    super("Falta identificarse o el usuario no existe.");
    this.name = "ErrorNoAutenticado";
  }
}
