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
  constructor(mensaje = "Falta iniciar sesión o la sesión venció. Volvé a ingresar.") {
    super(mensaje);
    this.name = "ErrorNoAutenticado";
  }
}

/** El recurso no existe o no pertenece al usuario: se responde 404 (RN-07). */
export class ErrorNoEncontrado extends Error {
  constructor(mensaje = "No se encontró lo que buscabas.") {
    super(mensaje);
    this.name = "ErrorNoEncontrado";
  }
}

/** La petición choca con el estado actual de los datos (email repetido, límite de material): se responde 409. */
export class ErrorConflicto extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorConflicto";
  }
}
