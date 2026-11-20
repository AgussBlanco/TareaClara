# Relevamiento de TareaClara

Documento de análisis previo al desarrollo: qué problema se resuelve, para quién, qué debe hacer el sistema y con qué límites. Las reglas exactas están numeradas en `docs/spec.md`; la forma de construirlo, en `docs/plan.md`.

## 1. El problema

Los estudiantes de secundaria y de los primeros años de la universidad llevan sus entregas en la cabeza, en el cuaderno o en mensajes sueltos. Consecuencias que se repiten:

- Se olvidan de la fecha de entrega o se dan cuenta tarde de cuántas cosas vencen juntas.
- No tienen a mano el material que usaron (el enlace de la guía, el apunte) cuando lo necesitan de nuevo.
- Semanas después no recuerdan qué nota sacaron ni qué entregaron.
- Las herramientas genéricas (planillas, listas de tareas) no distinguen materias, vencimientos ni notas, y se abandonan por el trabajo de mantenerlas.

## 2. Objetivo

Una aplicación web simple donde cada estudiante registra sus tareas con fecha límite, estado, prioridad, nota y material de estudio, y ve de un vistazo qué está vencido o por vencer. Funciona desde cualquier dispositivo con un navegador porque los datos viven en un servidor.

## 3. Usuarios

| Usuario | Qué necesita | Conocimientos técnicos |
|---|---|---|
| Estudiante (usuario único del sistema) | Cargar tareas rápido, ver qué urge, guardar material, consultar notas | Usa celular y computadora; no se espera ninguno más |

No hay administradores ni otros roles: cada cuenta solo ve sus datos. Quien despliega y mantiene el sistema es la persona responsable técnica (ver manual técnico y guía de despliegue).

## 4. Alcance

**Incluido:** cuentas con email y contraseña; alta, edición, eliminación y ocultamiento de tareas; estados; prioridad; nota; material de estudio (enlaces y apuntes); resumen de vencimientos; filtros y búsqueda; funcionamiento en celular.

**Fuera de alcance de esta versión:** recuperar contraseña por email, compartir tareas, notificaciones o recordatorios, adjuntar archivos, aplicación móvil nativa, importar desde calendarios.

## 5. Requisitos funcionales

| N.º | Requisito | Reglas de `spec.md` |
|---|---|---|
| RF-01 | Crear una cuenta con nombre, email y contraseña | RN-01, RN-02, RN-03 |
| RF-02 | Iniciar y cerrar sesión; la sesión dura 7 días | RN-04, RN-05, RN-34 |
| RF-03 | Crear una tarea con título, materia, fecha límite, prioridad y descripción | RN-08 a RN-14 |
| RF-04 | Cambiar el estado (No completada, En proceso, Completada) | RN-15, RN-16 |
| RF-05 | Cargar y quitar la nota (0 a 10) | RN-17 |
| RF-06 | Editar una tarea | RN-18 |
| RF-07 | Ocultar y volver a mostrar una tarea | RN-19 |
| RF-08 | Eliminar una tarea con confirmación | RN-20 |
| RF-09 | Agregar y quitar material de estudio (enlace o apunte) | RN-21 a RN-24 |
| RF-10 | Ver el estado de vencimiento de cada tarea (vencida, vence pronto, lejana) | RN-25, RN-26 |
| RF-11 | Ver la lista ordenada por urgencia | RN-27 |
| RF-12 | Filtrar por estado, prioridad y materia, y buscar por título | RN-28 |
| RF-13 | Ver un resumen con pendientes, vencidas, próximas y completadas | RN-29 |
| RF-14 | Que cada estudiante vea solo sus tareas | RN-07 |

## 6. Requisitos no funcionales

| N.º | Requisito | Cómo se cumple |
|---|---|---|
| RNF-01 | Seguridad de contraseñas | scrypt con sal por usuario (RN-03); mensaje de error igual para email o contraseña incorrectos (RN-04) |
| RNF-02 | Protección contra abuso | Máximo 10 intentos de registro o login cada 15 minutos por IP (RN-06); cuerpo de hasta 100 KB (RN-30) |
| RNF-03 | Integridad de datos | Restricciones en PostgreSQL además de las validaciones del código (RN-32) |
| RNF-04 | Sin secretos en el repositorio | Variables de entorno y `.env.example` (RN-33) |
| RNF-05 | Disponibilidad con servicios gratuitos | Render y Neon gratuitos se duermen por inactividad; el backend reintenta la conexión al arrancar y el frontend espera hasta 60 s avisando al usuario |
| RNF-06 | Uso en celular | Diseño adaptable; verificado a 390 px de ancho sin desborde |
| RNF-07 | Accesibilidad básica | Etiquetas en todos los campos, errores asociados al campo, foco visible, mensajes de estado con `role` |
| RNF-08 | Mantenibilidad | Capas separadas, spec numerada, tests con el número de regla, un commit por tarea |
| RNF-09 | Compatibilidad | Navegadores actuales; probado en Chromium |

## 7. Casos de uso principales

**CU-01 Registrarse.** El estudiante abre la aplicación, elige «Crear cuenta», completa nombre, email y contraseña. Si hay errores se marcan campo por campo; si el email ya existe se avisa. Al terminar entra directamente a «Mis tareas».

**CU-02 Cargar una tarea.** Desde «Nueva tarea» completa título, materia, fecha límite y prioridad. La tarea aparece ordenada en la lista con su situación («Vence en 2 días»).

**CU-03 Seguir una entrega.** Cambia el estado de la tarjeta a «En proceso» y luego a «Completada»; al completarla se guarda la fecha y la tarea pasa al final de la lista.

**CU-04 Guardar material.** En la tarjeta abre «Material de estudio» y agrega un enlace o un apunte. Los enlaces se abren en otra pestaña.

**CU-05 Registrar la nota.** Edita la tarea y completa la nota; se muestra en la tarjeta.

**CU-06 Despejar la lista.** Oculta las tareas viejas (se pueden recuperar desde «Ocultas») o elimina las que no sirven, con confirmación.

**CU-07 Cambiar de dispositivo.** Inicia sesión desde otro navegador y ve las mismas tareas.

## 8. Modelo de datos

```
usuarios (1) ───── (N) tareas (1) ───── (N) material_estudio
```

| Entidad | Datos principales |
|---|---|
| usuario | id, nombre, email (único, minúsculas), contraseña con hash, fecha de creación |
| tarea | id, usuario, título, descripción, materia, fecha límite, estado, prioridad, nota (opcional), oculta, fecha de creación, fecha de completado |
| material de estudio | id, tarea, título, tipo (enlace o apunte), contenido, orden |

Al eliminar una tarea se elimina su material. El detalle de columnas y restricciones está en `backend/migrations/001_inicial.sql`.

## 9. Restricciones y supuestos

- Se usan servicios gratuitos (Netlify, Render, Neon): el primer acceso tras un rato sin uso puede tardar cerca de un minuto.
- El estudiante tiene conexión a internet; no hay modo sin conexión.
- Las fechas límite son días de calendario sin hora; el vencimiento se calcula con la fecha local del estudiante (decisión de diseño: evita que el servidor, en UTC, marque distinto que el celular en UTC-3).
- Un estudiante puede tener varias sesiones abiertas; si edita la misma tarea en dos a la vez, gana la última escritura.

## 10. Riesgos

| Riesgo | Efecto | Mitigación |
|---|---|---|
| Arranque lento del servidor gratuito | Primera pantalla tarda | Aviso en pantalla y espera de hasta 60 s |
| Pérdida o límite de datos en la base gratuita | Se pierden tareas o se llena el espacio | Hacer copias con `pg_dump` cuando haya datos que importen (ver manual técnico) |
| Contraseñas débiles | Cuentas vulnerables | Mínimo 8 caracteres; límite de intentos |
| Secreto subido por error | Acceso indebido | `.env` ignorado por Git; revisión final de secretos |
| Un usuario ve datos de otro | Fuga de datos | Toda consulta filtra por el usuario del token; pruebas dedicadas |

## 11. Criterios de aceptación

La versión se considera terminada cuando: las 34 reglas de `spec.md` tienen pruebas que pasan; el recorrido de punta a punta pasa completo (`docs/informe-de-pruebas.md`); el frontend, el backend y la base están publicados y la lista de verificación del informe (sección 8) se cumple sobre la dirección pública.
