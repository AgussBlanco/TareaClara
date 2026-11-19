import type { BaseDatos, Ejecutor } from "../db/baseDatos";
import type { MaterialEstudio, Tarea } from "../dominio/tipos";
import type { ResultadoAgregarMaterial, TareaRepositorio } from "./tareaRepositorio";

// Las columnas se piden ya con la forma que usa la API: fechas como texto ISO (sin depender de la zona
// horaria del servidor) y la nota como número. Así no hay conversiones escondidas en el código.
const COLUMNAS_TAREA = `
  t.id,
  t.usuario_id AS "usuarioId",
  t.titulo,
  t.descripcion,
  t.materia,
  to_char(t.fecha_limite, 'YYYY-MM-DD') AS "fechaLimite",
  t.estado,
  t.prioridad,
  t.nota::float8 AS nota,
  t.oculta,
  to_char(t.fecha_creacion AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "fechaCreacion",
  to_char(t.fecha_completada AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "fechaCompletada"`;

type FilaTarea = Omit<Tarea, "materialEstudio">;
type FilaMaterial = MaterialEstudio & { tareaId: string };

/** Trae las tareas pedidas con su material (dos consultas, sin importar cuántas tareas sean). */
async function leerTareas(ejecutor: Ejecutor, condicion: string, parametros: unknown[]): Promise<Tarea[]> {
  const filas = await ejecutor.consultar<FilaTarea>(
    `SELECT ${COLUMNAS_TAREA} FROM tareas t WHERE ${condicion} ORDER BY t.fecha_creacion ASC, t.id ASC`,
    parametros
  );
  if (filas.length === 0) {
    return [];
  }

  const materiales = await ejecutor.consultar<FilaMaterial>(
    `SELECT m.id, m.tarea_id AS "tareaId", m.titulo, m.tipo, m.contenido
       FROM material_estudio m
      WHERE m.tarea_id = ANY($1::uuid[])
      ORDER BY m.orden ASC`,
    [filas.map((fila) => fila.id)]
  );

  const porTarea = new Map<string, MaterialEstudio[]>();
  for (const { tareaId, ...material } of materiales) {
    const lista = porTarea.get(tareaId) ?? [];
    lista.push(material);
    porTarea.set(tareaId, lista);
  }
  return filas.map((fila) => ({ ...fila, materialEstudio: porTarea.get(fila.id) ?? [] }));
}

async function leerUna(ejecutor: Ejecutor, usuarioId: string, id: string): Promise<Tarea | null> {
  const tareas = await leerTareas(ejecutor, "t.usuario_id = $1 AND t.id = $2", [usuarioId, id]);
  return tareas[0] ?? null;
}

/** Único lugar donde se escribe SQL de tareas. Todas las consultas usan parámetros, nunca texto pegado. */
export class TareaRepositorioPg implements TareaRepositorio {
  private readonly db: BaseDatos;

  constructor(db: BaseDatos) {
    this.db = db;
  }

  async crear(tarea: Tarea): Promise<Tarea> {
    // La tarea y su material se guardan juntos o no se guarda nada.
    await this.db.transaccion(async (tx) => {
      await tx.consultar(
        `INSERT INTO tareas
           (id, usuario_id, titulo, descripcion, materia, fecha_limite, estado, prioridad,
            nota, oculta, fecha_creacion, fecha_completada)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          tarea.id, tarea.usuarioId, tarea.titulo, tarea.descripcion, tarea.materia, tarea.fechaLimite,
          tarea.estado, tarea.prioridad, tarea.nota, tarea.oculta, tarea.fechaCreacion, tarea.fechaCompletada,
        ]
      );
      for (const material of tarea.materialEstudio) {
        await tx.consultar(
          "INSERT INTO material_estudio (id, tarea_id, titulo, tipo, contenido) VALUES ($1, $2, $3, $4, $5)",
          [material.id, tarea.id, material.titulo, material.tipo, material.contenido]
        );
      }
    });
    const guardada = await leerUna(this.db, tarea.usuarioId, tarea.id);
    if (!guardada) {
      throw new Error("La tarea recién creada no se encontró en la base de datos.");
    }
    return guardada;
  }

  listarPorUsuario(usuarioId: string): Promise<Tarea[]> {
    return leerTareas(this.db, "t.usuario_id = $1", [usuarioId]);
  }

  buscarPorId(usuarioId: string, id: string): Promise<Tarea | null> {
    return leerUna(this.db, usuarioId, id);
  }

  async guardar(tarea: Tarea): Promise<Tarea | null> {
    const filas = await this.db.consultar(
      `UPDATE tareas
          SET titulo = $3, descripcion = $4, materia = $5, fecha_limite = $6, estado = $7,
              prioridad = $8, nota = $9, oculta = $10, fecha_completada = $11
        WHERE id = $1 AND usuario_id = $2
    RETURNING id`,
      [
        tarea.id, tarea.usuarioId, tarea.titulo, tarea.descripcion, tarea.materia, tarea.fechaLimite,
        tarea.estado, tarea.prioridad, tarea.nota, tarea.oculta, tarea.fechaCompletada,
      ]
    );
    return filas.length === 0 ? null : leerUna(this.db, tarea.usuarioId, tarea.id);
  }

  async eliminar(usuarioId: string, id: string): Promise<boolean> {
    const filas = await this.db.consultar("DELETE FROM tareas WHERE id = $1 AND usuario_id = $2 RETURNING id", [id, usuarioId]);
    return filas.length > 0;
  }

  async agregarMaterial(
    usuarioId: string,
    tareaId: string,
    material: MaterialEstudio,
    maximo: number
  ): Promise<ResultadoAgregarMaterial> {
    return this.db.transaccion(async (tx): Promise<ResultadoAgregarMaterial> => {
      // FOR UPDATE: dos pedidos simultáneos sobre la misma tarea hacen fila y no pueden pasarse del máximo.
      const dueno = await tx.consultar("SELECT id FROM tareas WHERE id = $1 AND usuario_id = $2 FOR UPDATE", [tareaId, usuarioId]);
      if (dueno.length === 0) {
        return { resultado: "no_existe" };
      }
      const [{ cantidad }] = await tx.consultar<{ cantidad: number }>(
        "SELECT count(*)::int AS cantidad FROM material_estudio WHERE tarea_id = $1",
        [tareaId]
      );
      if ((cantidad ?? 0) >= maximo) {
        return { resultado: "limite" };
      }
      await tx.consultar(
        "INSERT INTO material_estudio (id, tarea_id, titulo, tipo, contenido) VALUES ($1, $2, $3, $4, $5)",
        [material.id, tareaId, material.titulo, material.tipo, material.contenido]
      );
      const tarea = await leerUna(tx, usuarioId, tareaId);
      return tarea ? { resultado: "ok", tarea } : { resultado: "no_existe" };
    });
  }

  async quitarMaterial(usuarioId: string, tareaId: string, materialId: string): Promise<Tarea | null> {
    const dueno = await this.db.consultar("SELECT id FROM tareas WHERE id = $1 AND usuario_id = $2", [tareaId, usuarioId]);
    if (dueno.length === 0) {
      return null;
    }
    await this.db.consultar("DELETE FROM material_estudio WHERE id = $1 AND tarea_id = $2", [materialId, tareaId]);
    return leerUna(this.db, usuarioId, tareaId);
  }
}
