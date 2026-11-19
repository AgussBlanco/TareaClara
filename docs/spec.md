# Especificación de TareaClara

Este documento es la fuente de verdad del comportamiento de la aplicación. Cada regla tiene un número (`RN-xx`)
y los tests la citan en su nombre, así que se puede seguir cada regla hasta el test que la comprueba
(ver la matriz de trazabilidad en `docs/informe-de-pruebas.md`).

**Si una regla cambia, primero se cambia acá y después el código y el test.**

## 1. Qué es

Aplicación web para estudiantes: guardan sus tareas con fecha límite, estado, prioridad, nota y material de
estudio, y ven de un vistazo qué está vencido o por vencer. Cada estudiante tiene su cuenta y solo ve lo suyo.

## 2. Reglas de negocio

### Cuentas y acceso

| N.º | Regla |
|---|---|
| RN-01 | Para registrarse hacen falta nombre (2 a 60 caracteres), email válido y contraseña de al menos 8 caracteres. |
| RN-02 | El email es único sin importar mayúsculas o minúsculas y se guarda en minúsculas. Si ya existe, el registro se rechaza (409). |
| RN-03 | La contraseña se guarda con scrypt y una sal aleatoria por usuario. Nunca se devuelve en una respuesta ni se escribe en los registros del servidor. |
| RN-04 | Con email y contraseña correctos, el login entrega un token JWT que vence a los 7 días. Si falla, la respuesta es siempre la misma (401, «El email o la contraseña no son correctos.») y no revela si el email existe. |
| RN-05 | Todas las rutas `/api/tareas` exigen un token válido y no vencido en el encabezado `Authorization: Bearer <token>`. Sin token, o con uno inválido o vencido, responden 401. |
| RN-06 | El registro y el login admiten como máximo 10 peticiones por dirección IP cada 15 minutos. Pasado el límite responden 429. |

### Tareas

| N.º | Regla |
|---|---|
| RN-07 | Cada usuario solo puede ver y modificar sus propias tareas. Pedir una tarea de otro usuario responde 404, igual que una tarea que no existe. |
| RN-08 | El título es obligatorio y tiene hasta 100 caracteres (sin contar espacios al principio y al final). |
| RN-09 | La materia es obligatoria y tiene hasta 50 caracteres. |
| RN-10 | La descripción es opcional y tiene hasta 500 caracteres. |
| RN-11 | La fecha límite es obligatoria, con formato `AAAA-MM-DD`, debe ser un día real del calendario (no existe `2026-02-31`) y el año debe estar entre 2000 y 2100. |
| RN-12 | Se puede crear una tarea con fecha límite pasada: se muestra como vencida. |
| RN-13 | La prioridad es Baja, Media o Alta. Si no se indica, es Media. |
| RN-14 | Una tarea nueva empieza «No completada», sin nota, visible y sin material. El id y la fecha de creación los decide el servidor. El dueño es siempre el usuario autenticado: un `usuarioId` enviado en el cuerpo se ignora. |
| RN-15 | Los estados son «No completada», «En proceso» y «Completada». Se puede pasar de cualquiera a cualquiera. |
| RN-16 | Al pasar a «Completada» se guarda la fecha y hora de completado. Al volver a otro estado esa fecha se borra. Marcar el estado que ya tiene no cambia nada. |
| RN-17 | La nota es opcional, va de 0 a 10 con hasta 2 decimales, y se puede quitar. Se puede cargar con cualquier estado. |
| RN-18 | Editar cambia título, descripción, materia, fecha límite, prioridad y nota. No cambia el estado, el dueño, el material ni la fecha de creación. |
| RN-19 | Ocultar saca la tarea de la lista principal pero conserva todos sus datos. Se puede volver a mostrar. |
| RN-20 | Eliminar borra la tarea y todo su material de forma definitiva. La pantalla pide confirmación antes de hacerlo. |

### Material de estudio

| N.º | Regla |
|---|---|
| RN-21 | Un material es un enlace o un apunte. El título es obligatorio (hasta 60 caracteres) y el contenido también (hasta 1000). |
| RN-22 | Un enlace solo se acepta si empieza con `http://` o `https://`. |
| RN-23 | Una tarea puede tener como máximo 20 materiales. Pasado el límite se rechaza (409). |
| RN-24 | Quitar un material no afecta a la tarea ni a los demás materiales. |

### Vencimiento y listas (se calculan en el navegador, con la fecha local del estudiante)

| N.º | Regla |
|---|---|
| RN-25 | Los días restantes se cuentan por día de calendario, no por horas: una tarea que vence mañana siempre «vence en 1 día», sea cual sea la hora. |
| RN-26 | Niveles de urgencia: **completada** si el estado es Completada; **crítico** si ya venció o vence hoy; **atención** si vence en 1 a 3 días; **normal** si vence en más de 3 días o la fecha no se puede leer. Una tarea de prioridad Alta que vence en 1 a 3 días es **crítico**. |
| RN-27 | La lista se ordena así: primero las no completadas, por fecha límite más cercana; con la misma fecha, mayor prioridad primero; las completadas van al final. |
| RN-28 | Se puede filtrar por estado, prioridad y materia, y buscar por texto en el título (sin distinguir mayúsculas ni tildes). |
| RN-29 | El resumen cuenta pendientes, vencidas, próximas (hoy y los próximos 3 días) y completadas, solo sobre las tareas visibles. |

### Sistema

| N.º | Regla |
|---|---|
| RN-30 | El cuerpo de una petición puede pesar como máximo 100 KB (413 si lo supera). |
| RN-31 | Todos los errores de la API tienen la forma `{ "error": { "codigo", "mensaje", "detalles"? } }` con el código HTTP que corresponde. Los errores inesperados se registran en el servidor y al cliente solo se le dice que hubo un error. |
| RN-32 | Los datos viven en PostgreSQL, con restricciones (clave foránea, `UNIQUE`, `CHECK`) que rechazan datos inválidos aunque un error del código los dejara pasar. |
| RN-33 | Ningún secreto está en el repositorio. La configuración va en variables de entorno. En producción, `JWT_SECRET` es obligatorio y tiene al menos 32 caracteres. |
| RN-34 | Si el token vence o deja de ser válido, la aplicación vuelve a la pantalla de ingreso. |

## 3. API

Todas las rutas devuelven JSON. Las de tareas necesitan `Authorization: Bearer <token>` (RN-05).

| Método y ruta | Qué hace | Respuesta |
|---|---|---|
| `GET /api/salud` | Comprueba que el servidor y la base responden | 200 |
| `POST /api/auth/registro` | Crea la cuenta (RN-01 a RN-03) | 201 `{ token, usuario }` |
| `POST /api/auth/login` | Inicia sesión (RN-04) | 200 `{ token, usuario }` |
| `GET /api/auth/yo` | Devuelve el usuario del token | 200 `usuario` |
| `GET /api/tareas` | Lista las tareas del usuario, con su material | 200 `Tarea[]` |
| `POST /api/tareas` | Crea una tarea (RN-08 a RN-14) | 201 `Tarea` |
| `GET /api/tareas/:id` | Devuelve una tarea (RN-07) | 200 `Tarea` |
| `PUT /api/tareas/:id` | Edita los datos de la tarea (RN-18) | 200 `Tarea` |
| `PATCH /api/tareas/:id/estado` | Cambia el estado `{ estado }` (RN-15, RN-16) | 200 `Tarea` |
| `PATCH /api/tareas/:id/oculta` | Oculta o muestra `{ oculta }` (RN-19) | 200 `Tarea` |
| `DELETE /api/tareas/:id` | Elimina la tarea (RN-20) | 204 |
| `POST /api/tareas/:id/material` | Agrega un material (RN-21 a RN-23) | 201 `Tarea` |
| `DELETE /api/tareas/:id/material/:materialId` | Quita un material (RN-24) | 200 `Tarea` |

Códigos de error: 400 `VALIDACION` o `JSON_INVALIDO`, 401 `NO_AUTENTICADO`, 404 `NO_ENCONTRADO`, 409 `CONFLICTO`,
413 `CUERPO_MUY_GRANDE`, 429 `DEMASIADOS_INTENTOS`, 500 `ERROR_INTERNO`.

## 4. Pantallas

1. **Ingreso y registro:** un formulario con dos pestañas (RN-01, RN-04). Muestra los errores campo por campo.
2. **Tablero «Mis tareas»:** resumen, vistas Activas y Ocultas, filtros, lista ordenada y botón «Nueva tarea».
3. **Formulario de tarea:** para crear y editar (RN-08 a RN-13, RN-17).
4. **Tarjeta de tarea:** estado, nota, urgencia, ocultar, eliminar con confirmación y material de estudio.
5. **Estados de carga y error:** mientras se espera al servidor se avisa, y si falla se explica qué pasó y se puede reintentar.

## 5. Fuera de alcance de esta versión

Recuperar contraseña por email, compartir tareas entre usuarios, notificaciones, adjuntar archivos y aplicación móvil.
