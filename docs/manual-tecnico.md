# Manual técnico — TareaClara

Para quien va a instalar, mantener o modificar el sistema. Las reglas de negocio están en `docs/spec.md`, las decisiones en `docs/plan.md` y las pruebas en `docs/informe-de-pruebas.md`. Para publicarlo, ver `docs/guia-de-despliegue.md`.

## 1. Arquitectura

```
Navegador (React + Vite)  ──HTTPS + JSON──►  API Express  ──SSL──►  PostgreSQL
 Netlify                                      Render                 Neon
                                              Controlador → Servicio → Repositorio
```

| Parte | Tecnología | Carpeta |
|---|---|---|
| Frontend | React 19, Vite 8, TypeScript | `frontend/` |
| Backend | Node ≥ 22.12, Express 5, TypeScript (modo estricto) | `backend/` |
| Base de datos | PostgreSQL, driver `pg` (SQL escrito a mano) | `backend/migrations/` |
| Pruebas | vitest; PGlite (PostgreSQL en memoria) para la base; Playwright para el recorrido | `backend/tests/`, `frontend/src/**/*.test.ts`, `e2e/` |

### Capas del backend

| Capa | Responsabilidad | Archivos |
|---|---|---|
| Rutas y controladores | Leer la petición HTTP, llamar al servicio, devolver la respuesta | `src/rutas`, `src/controladores` |
| Servicios | Reglas de negocio y validación (RN-xx) | `src/servicios` |
| Repositorios | Único lugar con SQL; interfaz + implementación PostgreSQL | `src/repositorios` |
| Dominio | Tipos, errores y manejo de fechas | `src/dominio` |
| Infraestructura | Conexión, migraciones, reintentos, configuración | `src/db`, `src/config` |
| Middlewares | Autenticación por token y manejo uniforme de errores | `src/middlewares` |

Las dependencias se arman a mano en `componer()` de `src/app.ts` (sin framework de inyección). Un servicio nunca conoce PostgreSQL: recibe un repositorio por interfaz, por eso las pruebas de reglas usan uno en memoria.

### Frontend

| Carpeta | Contenido |
|---|---|
| `src/lib` | Lógica pura y probada: vencimiento, orden, filtros, resumen, validaciones, cliente HTTP (`api.ts`), configuración |
| `src/hooks` | Estado de React: `useAuth` (sesión), `useTareas` (tareas con la API), `useAhora`, `useLento` |
| `src/components` | Pantallas y piezas visuales |
| `src/storage` | Guarda solo el token de sesión (`localStorage`, o memoria si el navegador lo bloquea) |

Decisiones que conviene conocer:

- **El servidor es la fuente de verdad.** No hay cambios «optimistas»: la lista se actualiza con la respuesta del servidor, y las acciones se bloquean mientras hay una en curso.
- **El vencimiento se calcula en el navegador** por día de calendario (RN-25, RN-26).
- Si el servidor responde 401 a una petición con sesión, el cliente borra el token y vuelve a «Ingresar» (RN-34).

## 2. Base de datos

Tres tablas (`backend/migrations/001_inicial.sql`):

```
usuarios (id UUID PK, nombre, email, contrasena_hash, fecha_creacion)
   └─< tareas (id UUID PK, usuario_id FK, titulo, descripcion, materia, fecha_limite DATE,
               estado, prioridad, nota NUMERIC(4,2), oculta, fecha_creacion, fecha_completada)
          └─< material_estudio (id UUID PK, tarea_id FK, titulo, tipo, contenido, orden)
```

- Las claves foráneas usan `ON DELETE CASCADE`: borrar una tarea borra su material.
- Las restricciones `CHECK` repiten los límites de la spec (longitudes, estados, prioridades, rango de nota y de fechas, coherencia entre estado y fecha de completado). Son la última defensa (RN-32).
- `email` es único sin distinguir mayúsculas (índice sobre `lower(email)`).
- Las fechas límite se leen con `to_char` como texto `AAAA-MM-DD` y la nota con `::float8` para que no cambien de formato al pasar por el driver.

### Migraciones

Los archivos numerados de `backend/migrations/` se aplican en orden al arrancar la API (`src/db/migraciones.ts`). La tabla `migraciones` guarda cuáles ya corrieron; cada una se aplica dentro de una transacción y con un candado (`pg_advisory_lock`) para que dos instancias no migren a la vez. **Una migración ya aplicada no se edita:** para cambiar el esquema, se agrega `002_...sql`.

El arranque reintenta la conexión 6 veces con 5 segundos de espera, porque la base gratuita de Neon puede estar dormida.

## 3. API

Resumen (detalle y reglas en `docs/spec.md`, sección 3):

| Método y ruta | Descripción |
|---|---|
| `GET /api/salud` | Salud del servicio y de la base (200 o 503) |
| `POST /api/auth/registro`, `POST /api/auth/login` | Devuelven `{ token, usuario }` |
| `GET /api/auth/yo` | Usuario del token |
| `GET/POST /api/tareas` | Listar y crear |
| `GET/PUT/DELETE /api/tareas/:id` | Ver, editar (reemplaza seis campos) y eliminar |
| `PATCH /api/tareas/:id/estado`, `PATCH /api/tareas/:id/oculta` | Cambios puntuales |
| `POST /api/tareas/:id/material`, `DELETE /api/tareas/:id/material/:materialId` | Material de estudio; ambos devuelven la tarea completa |

Formato de error (RN-31): `{ "error": { "codigo": "VALIDACION", "mensaje": "…", "detalles": [{ "campo": "titulo", "mensaje": "…" }] } }`. Códigos: 400 `VALIDACION` / `JSON_INVALIDO`, 401 `NO_AUTENTICADO`, 404 `NO_ENCONTRADO`, 409 `CONFLICTO`, 413 `CUERPO_MUY_GRANDE`, 429 `DEMASIADOS_INTENTOS`, 500 `ERROR_INTERNO`.

Ejemplo:

```bash
curl -X POST https://<api>/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"ana@correo.com","contrasena":"secreta123"}'
# → { "token": "eyJ...", "usuario": { "id": "...", "nombre": "Ana", "email": "ana@correo.com" } }

curl https://<api>/api/tareas -H "Authorization: Bearer eyJ..."
```

## 4. Seguridad

| Tema | Cómo está resuelto |
|---|---|
| Contraseñas | `scrypt` (N=16384, r=8, p=1) con sal aleatoria por usuario; formato `scrypt$N$r$p$sal$hash`. Al verificar se limita N para que un hash manipulado no consuma memoria |
| Sesión | Token JWT HS256 firmado con `JWT_SECRET`, vence a los 7 días; viaja en `Authorization: Bearer`, sin cookies (no hay riesgo de CSRF) |
| Login | Mismo mensaje y mismo tiempo de respuesta aproximado para email inexistente y contraseña incorrecta (se calcula un hash de relleno) |
| Abuso | 10 peticiones de registro/login cada 15 min por IP (`express-rate-limit`); cuerpos de hasta 100 KB |
| Aislamiento | Toda consulta de tareas filtra por el usuario del token; el id de usuario enviado por el cliente se ignora |
| Inyección SQL | Todas las consultas son parametrizadas (`$1`, `$2`…) |
| XSS | React escapa el texto; los enlaces de material solo se muestran si empiezan con http(s) y se abren con `rel="noopener noreferrer"` |
| CORS | Solo los orígenes de `CORS_ORIGINS` pueden leer respuestas desde un navegador |
| Secretos | Solo en variables de entorno; `.env` está en `.gitignore`; el repositorio contiene `.env.example` sin valores reales |

## 5. Configuración (variables de entorno)

### Backend (`backend/.env.example`)

| Variable | Obligatoria | Descripción |
|---|---|---|
| `DATABASE_URL` | Sí | Cadena de conexión `postgres://…` (en Neon, la que da el panel, con `sslmode=require`) |
| `JWT_SECRET` | Sí | Clave para firmar tokens. En producción, al menos 32 caracteres. Cambiarla cierra todas las sesiones |
| `CORS_ORIGINS` | En producción | Direcciones del frontend separadas por coma, sin barra final (`https://tareaclara.netlify.app`) |
| `PORT` | No | Puerto (Render lo define solo). Por defecto 3000 |
| `TRUST_PROXY` | No | Cantidad de proxies delante de la API. Por defecto 1 en producción (Render) |
| `NODE_ENV` | No | `production` activa las exigencias de arriba |

Si falta algo, el servidor no arranca y dice qué variable falta, sin imprimir los valores.

### Frontend (`frontend/.env.example`)

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | Dirección de la API, sin barra final. Se incorpora **al compilar**: si se cambia, hay que volver a desplegar. En desarrollo, si falta, usa `http://localhost:3000` |

## 6. Desarrollo local

Hace falta Node ≥ 22.12 y una base PostgreSQL (por ejemplo una gratuita de Neon, o una local).

```bash
# Backend
cd backend
cp .env.example .env        # completar DATABASE_URL y JWT_SECRET (.env no se sube a Git)
npm ci
npm run dev                  # http://localhost:3000, con recarga automática

# Frontend (otra terminal)
cd frontend
npm ci
npm run dev                  # http://localhost:5173
```

`npm run dev` lee `backend/.env` solo (y arranca sin él si exportás las variables a mano). `npm start` (producción) no lee archivos: usa las variables del entorno. Los tests **no** necesitan base ni variables: usan PGlite.

| Comando (en `backend/` y `frontend/`) | Para qué |
|---|---|
| `npm test` | Todas las pruebas |
| `npm run typecheck` | Revisar tipos |
| `npm run build` | Compilar para producción |

## 7. Cómo agregar una regla o una funcionalidad

1. Escribir o cambiar la regla en `docs/spec.md` (número `RN-xx` nuevo, sin reutilizar números).
2. Escribir el test; su nombre empieza con el número de la regla.
3. Implementar (servicio → repositorio → controlador). Si cambia el esquema, agregar una migración nueva.
4. Actualizar la matriz de trazabilidad de `docs/informe-de-pruebas.md`.
5. Un commit por tarea, con el mensaje `Txx: …` y la tarea tildada en `docs/tareas.md`. Más reglas para agentes en `AGENTS.md`.

## 8. Operación y mantenimiento

| Tema | Detalle |
|---|---|
| Registros | La API escribe en la salida estándar (se ven en el panel de Render). No se registran contraseñas ni tokens |
| Salud | `GET /api/salud`: 200 si la API y la base responden; 503 si la base no. Render lo usa como control de salud |
| Apagado | Ante `SIGTERM` termina las peticiones en curso y cierra el pool (10 s como máximo) |
| Copias de seguridad | Con `pg_dump "$DATABASE_URL" > copia.sql` (necesita las herramientas de PostgreSQL). Neon también ofrece restauración a un punto anterior según el plan |
| Rotar `JWT_SECRET` | Cambiar la variable en Render y reiniciar: todas las sesiones se cierran |
| Recuperar contraseña | No hay función en la app. Un administrador puede borrar la cuenta desde la base o dejar que el usuario cree otra |

## 9. Limitaciones conocidas

1. **Primera petición lenta:** el plan gratuito de Render duerme el servicio tras 15 minutos sin tráfico; despertarlo tarda cerca de un minuto. El frontend espera hasta 60 s y lo avisa.
2. **Edición simultánea:** `PUT` reemplaza los seis campos de la tarea; si la misma cuenta edita la misma tarea desde dos pestañas, gana la última escritura. No hay control de versiones.
3. **Sin recuperación de contraseña ni verificación de email.**
4. **El token no se puede revocar** antes de su vencimiento (7 días) salvo rotando `JWT_SECRET`.
5. **Límite de intentos por IP:** varias personas detrás de la misma IP (por ejemplo una escuela) comparten el mismo contador de 10 intentos.
6. **Sin pruebas de carga.** Concurrencia verificada solo con 6 peticiones simultáneas (ver informe de pruebas, sección 7).
7. **Las pruebas de base usan PGlite**, que se comporta como PostgreSQL pero no es el servidor de producción; el recorrido con el driver `pg` real se hizo una vez de forma manual.
