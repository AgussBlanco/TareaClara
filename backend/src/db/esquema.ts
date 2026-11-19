// Modelo relacional de TareaClara (ver Clase 15: entidades, claves primarias y foráneas).
//   usuarios 1 ──< tareas 1 ──< material_estudio
// Las restricciones CHECK repiten las reglas importantes como última defensa:
// aunque un bug dejara pasar un dato inválido, la base de datos lo rechaza.
export const ESQUEMA_SQL = `
CREATE TABLE IF NOT EXISTS usuarios (
  id              TEXT PRIMARY KEY,
  nombre          TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE COLLATE NOCASE,
  contrasena_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tareas (
  id               TEXT PRIMARY KEY,
  usuario_id       TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo           TEXT NOT NULL,
  descripcion      TEXT NOT NULL DEFAULT '',
  materia          TEXT NOT NULL,
  fecha_limite     TEXT NOT NULL,
  estado           TEXT NOT NULL CHECK (estado IN ('No completada', 'En proceso', 'Completada')),
  prioridad        TEXT NOT NULL CHECK (prioridad IN ('Baja', 'Media', 'Alta')),
  nota             REAL CHECK (nota IS NULL OR (nota >= 0 AND nota <= 10)),
  oculta           INTEGER NOT NULL DEFAULT 0 CHECK (oculta IN (0, 1)),
  fecha_creacion   TEXT NOT NULL,
  fecha_completada TEXT
);

CREATE TABLE IF NOT EXISTS material_estudio (
  id        TEXT PRIMARY KEY,
  tarea_id  TEXT NOT NULL REFERENCES tareas(id) ON DELETE CASCADE,
  titulo    TEXT NOT NULL,
  tipo      TEXT NOT NULL CHECK (tipo IN ('link', 'texto')),
  contenido TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tareas_usuario ON tareas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_material_tarea ON material_estudio(tarea_id);
`;
