import type { BaseDeDatos } from "../db/conexion";
import type { EstadoTarea, MaterialEstudio, Prioridad, Tarea, TipoMaterial } from "../dominio/tipos";
import type { TareaRepositorio } from "./tareaRepositorio";

interface FilaTarea {
  id: string;
  usuario_id: string;
  titulo: string;
  descripcion: string;
  materia: string;
  fecha_limite: string;
  estado: EstadoTarea;
  prioridad: Prioridad;
  nota: number | null;
  oculta: number;
  fecha_creacion: string;
  fecha_completada: string | null;
}

interface FilaMaterial {
  id: string;
  tarea_id: string;
  titulo: string;
  tipo: TipoMaterial;
  contenido: string;
}

function aTarea(fila: FilaTarea, materialEstudio: MaterialEstudio[]): Tarea {
  return {
    id: fila.id,
    usuarioId: fila.usuario_id,
    titulo: fila.titulo,
    descripcion: fila.descripcion,
    materia: fila.materia,
    fechaLimite: fila.fecha_limite,
    estado: fila.estado,
    prioridad: fila.prioridad,
    nota: fila.nota,
    materialEstudio,
    oculta: fila.oculta === 1,
    fechaCreacion: fila.fecha_creacion,
    fechaCompletada: fila.fecha_completada,
  };
}

/** Único lugar donde se escribe SQL de tareas. Todas las consultas usan parámetros, nunca texto pegado. */
export class TareaRepositorioSqlite implements TareaRepositorio {
  private readonly db: BaseDeDatos;

  constructor(db: BaseDeDatos) {
    this.db = db;
  }

  async crear(tarea: Tarea): Promise<Tarea> {
    const insertarTarea = this.db.prepare(
      `INSERT INTO tareas
         (id, usuario_id, titulo, descripcion, materia, fecha_limite, estado, prioridad,
          nota, oculta, fecha_creacion, fecha_completada)
       VALUES
         (@id, @usuario_id, @titulo, @descripcion, @materia, @fecha_limite, @estado, @prioridad,
          @nota, @oculta, @fecha_creacion, @fecha_completada)`
    );
    const insertarMaterial = this.db.prepare(
      `INSERT INTO material_estudio (id, tarea_id, titulo, tipo, contenido)
       VALUES (@id, @tarea_id, @titulo, @tipo, @contenido)`
    );

    // La tarea y su material se guardan juntos o no se guarda nada.
    const guardarTodo = this.db.transaction(() => {
      insertarTarea.run({
        id: tarea.id,
        usuario_id: tarea.usuarioId,
        titulo: tarea.titulo,
        descripcion: tarea.descripcion,
        materia: tarea.materia,
        fecha_limite: tarea.fechaLimite,
        estado: tarea.estado,
        prioridad: tarea.prioridad,
        nota: tarea.nota,
        oculta: tarea.oculta ? 1 : 0,
        fecha_creacion: tarea.fechaCreacion,
        fecha_completada: tarea.fechaCompletada,
      });
      for (const material of tarea.materialEstudio) {
        insertarMaterial.run({ ...material, tarea_id: tarea.id });
      }
    });
    guardarTodo();

    return tarea;
  }

  async listarPorUsuario(usuarioId: string): Promise<Tarea[]> {
    const filas = this.db
      .prepare("SELECT * FROM tareas WHERE usuario_id = ? ORDER BY fecha_creacion ASC, id ASC")
      .all(usuarioId) as FilaTarea[];
    if (filas.length === 0) {
      return [];
    }

    const materiales = this.db
      .prepare(
        `SELECT m.* FROM material_estudio m
         JOIN tareas t ON t.id = m.tarea_id
         WHERE t.usuario_id = ?
         ORDER BY m.rowid ASC`
      )
      .all(usuarioId) as FilaMaterial[];

    const porTarea = new Map<string, MaterialEstudio[]>();
    for (const fila of materiales) {
      const lista = porTarea.get(fila.tarea_id) ?? [];
      lista.push({ id: fila.id, titulo: fila.titulo, tipo: fila.tipo, contenido: fila.contenido });
      porTarea.set(fila.tarea_id, lista);
    }

    return filas.map((fila) => aTarea(fila, porTarea.get(fila.id) ?? []));
  }
}
