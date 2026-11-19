-- Esquema inicial de TareaClara (PostgreSQL).
--   usuarios 1 ──< tareas 1 ──< material_estudio
-- Las restricciones repiten las reglas de docs/spec.md como última defensa (RN-32):
-- aunque un error del código dejara pasar un dato inválido, la base lo rechaza.

CREATE TABLE usuarios (
  id              UUID PRIMARY KEY,
  nombre          TEXT NOT NULL CHECK (char_length(nombre) BETWEEN 2 AND 60),
  email           TEXT NOT NULL CHECK (email = lower(email)),
  contrasena_hash TEXT NOT NULL,
  fecha_creacion  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RN-02: el email es único sin importar mayúsculas.
CREATE UNIQUE INDEX usuarios_email_unico ON usuarios (lower(email));

CREATE TABLE tareas (
  id               UUID PRIMARY KEY,
  usuario_id       UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo           TEXT NOT NULL CHECK (char_length(titulo) BETWEEN 1 AND 100),
  descripcion      TEXT NOT NULL DEFAULT '' CHECK (char_length(descripcion) <= 500),
  materia          TEXT NOT NULL CHECK (char_length(materia) BETWEEN 1 AND 50),
  fecha_limite     DATE NOT NULL CHECK (fecha_limite BETWEEN DATE '2000-01-01' AND DATE '2100-12-31'),
  estado           TEXT NOT NULL CHECK (estado IN ('No completada', 'En proceso', 'Completada')),
  prioridad        TEXT NOT NULL CHECK (prioridad IN ('Baja', 'Media', 'Alta')),
  nota             NUMERIC(4, 2) CHECK (nota IS NULL OR (nota >= 0 AND nota <= 10)),
  oculta           BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_creacion   TIMESTAMPTZ NOT NULL,
  fecha_completada TIMESTAMPTZ,
  -- RN-16: la fecha de completado existe si y solo si la tarea está completada.
  CONSTRAINT completada_coherente CHECK ((estado = 'Completada') = (fecha_completada IS NOT NULL))
);

CREATE INDEX tareas_por_usuario ON tareas (usuario_id);

CREATE TABLE material_estudio (
  id        UUID PRIMARY KEY,
  tarea_id  UUID NOT NULL REFERENCES tareas(id) ON DELETE CASCADE,
  titulo    TEXT NOT NULL CHECK (char_length(titulo) BETWEEN 1 AND 60),
  tipo      TEXT NOT NULL CHECK (tipo IN ('link', 'texto')),
  contenido TEXT NOT NULL CHECK (char_length(contenido) BETWEEN 1 AND 1000),
  orden     BIGINT GENERATED ALWAYS AS IDENTITY
);

CREATE INDEX material_por_tarea ON material_estudio (tarea_id);
