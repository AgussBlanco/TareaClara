# Informe de pruebas — TareaClara

Resultado de las pruebas ejecutadas sobre la versión entregada (todas las tareas T01 a T11 terminadas). Los números de este informe salen de las ejecuciones reales; el detalle por regla está en la matriz de trazabilidad.

## 1. Resumen

| Tipo de prueba | Cantidad | Resultado |
|---|---:|---|
| Automáticas del backend (vitest) | 196 | 196 correctas, 0 fallidas |
| Automáticas del frontend (vitest) | 80 | 80 correctas, 0 fallidas |
| Recorrido completo en navegador (Playwright + Chromium) | 44 comprobaciones | 44 correctas; ejecutado dos veces sobre bases nuevas |
| Verificación del build compilado con el driver real `pg` | 1 recorrido | correcto (ver 4.3) |
| Chequeo de tipos (`tsc --noEmit`, backend y frontend) | 2 | sin errores |
| Compilación de producción (`npm run build`, backend y frontend) | 2 | correctas |

Las 34 reglas de negocio de `docs/spec.md` (RN-01 a RN-34) tienen al menos una prueba automática. Cada prueba lleva el código de la regla al principio de su nombre (por ejemplo `RN-17: ...`), como pide `AGENTS.md`.

## 2. Cómo se ejecutaron

```bash
# Backend (usa PGlite: PostgreSQL real en memoria, sin instalar nada)
cd backend && npm ci && npm test && npm run typecheck && npm run build

# Frontend
cd frontend && npm ci && npm test && npm run typecheck && npm run build

# Recorrido en navegador (necesita Playwright y los tres servicios levantados, ver sección 4)
node e2e/recorrido.mjs http://localhost:4173 docs/capturas
```

Entorno: Node 22.12, Linux, Chromium headless con zona horaria `America/Argentina/Buenos_Aires`.

## 3. Pruebas automáticas

### 3.1 Backend (196 pruebas)

| Archivo | Pruebas |
|---|---:|
| `backend/tests/auth.http.test.ts` | 16 |
| `backend/tests/authServicio.test.ts` | 16 |
| `backend/tests/configuracion.test.ts` | 10 |
| `backend/tests/contrasenas.test.ts` | 5 |
| `backend/tests/migraciones.test.ts` | 17 |
| `backend/tests/repositorios.test.ts` | 19 |
| `backend/tests/sistema.http.test.ts` | 5 |
| `backend/tests/tareaServicio.test.ts` | 76 |
| `backend/tests/tareas.http.test.ts` | 27 |
| `backend/tests/tokens.test.ts` | 5 |

Qué cubren: reglas del servicio con un repositorio en memoria; el mismo contrato contra PostgreSQL (PGlite) para el repositorio real; migraciones y restricciones `CHECK`/`UNIQUE`/clave foránea; la API HTTP completa con peticiones reales a un servidor Express (códigos, formato de error, aislamiento entre usuarios, límite de tamaño, límite de intentos, CORS, salud); hash de contraseñas, tokens y validación de la configuración.

### 3.2 Frontend (80 pruebas)

| Archivo | Pruebas |
|---|---:|
| `frontend/src/lib/api.test.ts` | 11 |
| `frontend/src/lib/config.test.ts` | 4 |
| `frontend/src/lib/filtros.test.ts` | 6 |
| `frontend/src/storage/sesion.test.ts` | 2 |
| `frontend/src/lib/tareas.test.ts` | 5 |
| `frontend/src/lib/validaciones.test.ts` | 33 |
| `frontend/src/lib/vencimiento.test.ts` | 19 |

Qué cubren: cliente HTTP con `fetch` simulado (token, rutas, errores del servidor, 401, 429, sin conexión, tiempo de espera, respuestas que no son JSON), configuración de la dirección del servidor, almacén del token, validaciones de formularios y la lógica pura de vencimiento, orden, filtros y resumen.

## 4. Recorrido de punta a punta

### 4.1 Montaje

PostgreSQL (PGlite expuesto por socket) ← API compilada (`node dist/index.js`, migraciones al arrancar) ← frontend compilado con `VITE_API_URL` apuntando a esa API, servido con `vite preview`. El script `e2e/recorrido.mjs` maneja Chromium como lo haría una persona.

### 4.2 Resultado: 44 de 44 comprobaciones

- **Acceso:** registro vacío con errores; registro válido; login con contraseña incorrecta (mensaje del servidor); login sin distinguir mayúsculas; email repetido rechazado; cerrar sesión borra el token.
- **Tareas:** formulario vacío marca los tres obligatorios; se crean 5 tareas; textos de vencimiento («Vencida hace 3 días», «Vence en 2 días», «Faltan 12 días»); margen rojo y resaltador; orden por fecha y completadas al final; contadores del resumen.
- **Edición:** nota 11 rechazada y 8,5 guardada; estado; ocultar y verla en «Ocultas»; búsqueda sin tildes; filtro por materia; eliminar con cancelación y con confirmación.
- **Material:** enlace `javascript:` rechazado; enlace válido con `rel="noopener noreferrer"`; contador de material.
- **Servidor como fuente de verdad:** tras recargar, sesión y tareas siguen; desde un navegador nuevo, con el mismo usuario, se ven las mismas tareas; en el navegador solo queda el token y la contraseña no se guarda.
- **RN-34:** con un token inválido la app vuelve a «Ingresar» y borra el token.
- **Aislamiento:** otro usuario no ve las tareas de Ana.
- **Fallos de red:** sin conexión aparece «No se pudo conectar con el servidor», la pantalla conserva el valor guardado y, al volver la conexión, el cambio se guarda.
- **Pantalla de 390 px:** sin desborde horizontal. Sin errores inesperados en la consola.

Capturas en `docs/capturas/` (`01-acceso.png`, `02-tablero.png`, `03-movil.png`).

### 4.3 Build compilado con el driver real

Las pruebas automáticas usan PGlite; para no depender solo de él, se levantó el servidor compilado contra PGlite expuesto por socket usando el driver `pg` de producción: se aplicaron las migraciones, se registró un usuario, se creó una tarea, se agregó material, se cambió el estado, se verificó la respuesta de CORS (preflight) y se lanzaron 6 peticiones concurrentes. Todo respondió como se esperaba.

## 5. Matriz de trazabilidad

La cantidad de pruebas por regla sale del nombre de cada prueba automática.

| Regla | Qué exige | Tests backend | Tests frontend | Recorrido E2E |
|---|---|---:|---:|---|
| RN-01 | Para registrarse hacen falta nombre (2 a 60 caracteres), email válido y contraseña de 8 a 200 caracteres. | 12 | 1 | registro vacío y registro válido |
| RN-02 | El email es único sin importar mayúsculas o minúsculas y se guarda en minúsculas. Si ya existe, el registro se… | 6 | 0 | email repetido rechazado; login sin distinguir mayúsculas |
| RN-03 | La contraseña se guarda con scrypt y una sal aleatoria por usuario. Nunca se devuelve en una respuesta ni se e… | 7 | 0 | - |
| RN-04 | Con email y contraseña correctos, el login entrega un token JWT que vence a los 7 días. Si falla, la respuesta… | 8 | 0 | login correcto e incorrecto |
| RN-05 | Todas las rutas `/api/tareas` exigen un token válido y no vencido en el encabezado `Authorization: Bearer <tok… | 10 | 0 | tareas solo con sesión |
| RN-06 | El registro y el login admiten como máximo 10 peticiones por dirección IP cada 15 minutos. Pasado el límite re… | 1 | 0 | - |
| RN-07 | Cada usuario solo puede ver y modificar sus propias tareas. Pedir una tarea de otro usuario responde 404, igua… | 15 | 0 | otro usuario no ve tareas ajenas |
| RN-08 | El título es obligatorio y tiene hasta 100 caracteres (sin contar espacios al principio y al final). | 9 | 0 | - |
| RN-09 | La materia es obligatoria y tiene hasta 50 caracteres. | 3 | 0 | - |
| RN-10 | La descripción es opcional y tiene hasta 500 caracteres. | 3 | 0 | - |
| RN-11 | La fecha límite es obligatoria, con formato `AAAA-MM-DD`, debe ser un día real del calendario (no existe `2026… | 15 | 1 | - |
| RN-12 | Se puede crear una tarea con fecha límite pasada: se muestra como vencida. | 1 | 0 | tarea vencida se muestra como vencida |
| RN-13 | La prioridad es Baja, Media o Alta. Si no se indica, es Media. | 3 | 0 | - |
| RN-14 | Una tarea nueva empieza «No completada», visible y sin material (la nota es opcional, RN-17). El id y la fecha… | 5 | 0 | - |
| RN-15 | Los estados son «No completada», «En proceso» y «Completada». Se puede pasar de cualquiera a cualquiera. | 5 | 0 | cambio de estado desde la tarjeta |
| RN-16 | Al pasar a «Completada» se guarda la fecha y hora de completado. Al volver a otro estado esa fecha se borra. M… | 8 | 0 | - |
| RN-17 | La nota es opcional, va de 0 a 10 con hasta 2 decimales, y se puede quitar. Se puede cargar con cualquier esta… | 18 | 0 | nota 11 rechazada, 8,5 guardada |
| RN-18 | Editar (`PUT`) reemplaza título, descripción, materia, fecha límite, prioridad y nota: título, materia, fecha … | 7 | 0 | - |
| RN-19 | Ocultar saca la tarea de la lista principal pero conserva todos sus datos. Se puede volver a mostrar. | 5 | 0 | ocultar y ver en «Ocultas» |
| RN-20 | Eliminar borra la tarea y todo su material de forma definitiva. La pantalla pide confirmación antes de hacerlo… | 4 | 0 | eliminar con confirmación y cancelación |
| RN-21 | Un material es un enlace o un apunte. El título es obligatorio (hasta 60 caracteres) y el contenido también (h… | 5 | 0 | material con enlace |
| RN-22 | Un enlace solo se acepta si empieza con `http://` o `https://`. | 8 | 0 | enlace `javascript:` rechazado |
| RN-23 | Una tarea puede tener como máximo 20 materiales. Pasado el límite se rechaza (409). | 4 | 0 | - |
| RN-24 | Quitar un material no afecta a la tarea ni a los demás materiales. | 3 | 0 | - |
| RN-25 | Los días restantes se cuentan por día de calendario, no por horas: una tarea que vence mañana siempre «vence e… | 0 | 3 | «Vence en 2 días», «Faltan 12 días» |
| RN-26 | Niveles de urgencia: **completada** si el estado es Completada; **crítico** si ya venció o vence hoy; **atenci… | 0 | 3 | margen rojo / resaltador |
| RN-27 | La lista se ordena así: primero las no completadas, por fecha límite más cercana; con la misma fecha, mayor pr… | 0 | 1 | orden de la lista |
| RN-28 | Se puede filtrar por estado, prioridad y materia, y buscar por texto en el título (sin distinguir mayúsculas n… | 0 | 4 | búsqueda y filtro por materia |
| RN-29 | El resumen cuenta pendientes, vencidas, próximas (hoy y los próximos 3 días) y completadas, solo sobre las tar… | 0 | 1 | contadores del resumen |
| RN-30 | El cuerpo de una petición puede pesar como máximo 100 KB (413 si lo supera). | 1 | 0 | - |
| RN-31 | Todos los errores de la API tienen la forma `{ "error": { "codigo", "mensaje", "detalles"? } }` con el código … | 2 | 0 | - |
| RN-32 | Los datos viven en PostgreSQL, con restricciones (clave foránea, `UNIQUE`, `CHECK`) que rechazan datos inválid… | 15 | 0 | - |
| RN-33 | Ningún secreto está en el repositorio. La configuración va en variables de entorno. En producción, `JWT_SECRET… | 7 | 0 | - |
| RN-34 | Si el token vence o deja de ser válido, la aplicación vuelve a la pantalla de ingreso. | 0 | 1 | token inválido → pantalla de ingreso |

## 6. Defectos encontrados durante las pruebas

- Mientras se escribía el recorrido E2E, 7 comprobaciones fallaron en la primera ejecución y 1 en la segunda. Todas eran del propio script: comprobaban la pantalla antes de que la API respondiera. Se resolvió esperando el resultado (no se tocó la aplicación). No hubo defectos de la aplicación en esa ejecución.
- Durante el desarrollo del backend no hubo pruebas fallidas en T02 a T07 (la suite creció de 17 a 196 pruebas).

## 7. Limitaciones conocidas y lo que no se probó

1. **Edición simultánea:** si la misma cuenta edita una tarea desde dos pestañas a la vez, gana la última escritura (`PUT` reemplaza los seis campos, incluida la prioridad). La pantalla bloquea las acciones mientras hay una en curso, pero entre dos pestañas no hay control de versiones.
2. **Concurrencia real en PostgreSQL:** el límite de 20 materiales usa `FOR UPDATE`; la prueba automática corre en PGlite (un solo hilo), así que ese bloqueo solo se verificó por las 6 peticiones simultáneas del punto 4.3, no con carga alta.
3. **Servidor publicado:** las pruebas se hicieron en local. El plan gratuito de Render duerme tras 15 minutos sin uso y la primera petición puede tardar cerca de un minuto; la aplicación lo avisa en pantalla pero ese tiempo no se midió en Render. La lista de verificación de la sección 8 se ejecuta una vez publicado.
4. **Componentes de React:** no hay pruebas automáticas de los componentes por separado; se cubren con el recorrido en navegador (solo Chromium; no se probó Firefox ni Safari).
5. **Fuentes web:** el entorno de pruebas no podía descargar fuentes de Google, así que las capturas usan la fuente de reserva.
6. **Rendimiento y seguridad avanzada:** no se hicieron pruebas de carga ni de penetración. Sí se verificó: consultas parametrizadas, hash con scrypt, límite de intentos, CORS limitado a los orígenes configurados, mensajes iguales para email y contraseña incorrectos.

## 8. Lista de verificación para el sitio publicado

Después de seguir `docs/guia-de-despliegue.md`, comprobar con la dirección pública:

- [ ] `https://<api>/api/salud` responde `{"estado":"ok"}`.
- [ ] Abrir el sitio de Netlify: se ve «Ingresar» (no «Falta configurar la aplicación»).
- [ ] Crear una cuenta y entrar (si falla con un error de red, revisar `CORS_ORIGINS`).
- [ ] Crear una tarea, cambiar su estado, agregar material, ocultarla y eliminarla.
- [ ] Recargar la página: la sesión y las tareas siguen.
- [ ] Abrir el sitio desde el celular con la misma cuenta: se ven las mismas tareas.
- [ ] Cerrar sesión y volver a entrar.
