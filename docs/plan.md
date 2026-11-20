# Plan del proyecto TareaClara

## 1. Objetivo

Entregar una aplicación web funcionando en internet, con frontend, backend y base de datos publicados, que
resuelva un problema real: los estudiantes se atrasan con sus tareas porque se olvidan de la fecha de entrega y,
semanas después, de lo que entregaron.

## 2. Decisiones técnicas

| Tema | Decisión | Por qué |
|---|---|---|
| Frontend | React + Vite + TypeScript, publicado en Netlify | Ya estaba hecho y probado (la lógica de vencimiento, orden y filtros se conservó). Netlify es lo que recomienda la cátedra. |
| Backend | Node + Express + TypeScript, publicado en Render | Misma lengua que el frontend; capas Controlador, Servicio y Repositorio. |
| Base de datos | PostgreSQL en Neon | Es la base que recomienda la cátedra y es gratis para este tamaño. Reemplaza a SQLite, que no sirve en Render (el disco se borra en cada despliegue). |
| Acceso a la base | Paquete `pg` con SQL escrito a mano y parámetros | Cercano al modelo relacional visto en clase. Sin ORM, para que cada consulta se pueda leer. |
| Tests de base de datos | PGlite (PostgreSQL real dentro del proceso) | Los tests de repositorio corren sobre PostgreSQL de verdad sin instalar un servidor. |
| Login | Contraseña con scrypt + token JWT (7 días) | scrypt viene con Node (sin dependencias). El token evita guardar sesiones en el servidor. |
| Vencimiento | Se calcula en el navegador, por día de calendario | Decisión de la Clase 4: el servidor (UTC) y el estudiante (UTC-3) darían resultados distintos para el mismo instante. |
| Configuración | Variables de entorno; `.env.example` en el repo | Ningún secreto en el repositorio. |

## 3. Arquitectura

```
Navegador (React)  ──HTTPS──►  API Express (Render)  ──SSL──►  PostgreSQL (Neon)
 Netlify                        Controlador → Servicio → Repositorio
```

## 4. Orden de trabajo

El trabajo se divide en tareas chicas (`docs/tareas.md`). Cada una tiene su commit y sus tests:

1. Preparar el repositorio y escribir la spec y el AGENTS.md.
2. Pasar la base a PostgreSQL con migraciones.
3. Repositorios de usuarios y tareas.
4. Registro y login.
5. API de tareas.
6. Estado, ocultar y material.
7. Configuración y despliegue del backend.
8. a 10. Conectar el frontend a la API.
11. Prueba de punta a punta e informe de pruebas.
12. a 14. Relevamiento, manuales, guía de despliegue y README.
15. Revisión final contra la consigna.

## 5. Riesgos y qué hacemos

| Riesgo | Qué hacemos |
|---|---|
| El plan gratuito de Render «duerme» el servicio y la primera petición tarda | El frontend espera hasta 60 segundos y mientras tanto muestra «El servidor gratuito está despertando»; está explicado en el manual de usuario. |
| La base gratuita de Neon se suspende por inactividad | Se reactiva sola con la primera consulta; el backend reintenta la conexión al arrancar. |
| Un secreto sube por error a GitHub | `.env` está en `.gitignore`, hay un `.env.example`, y la revisión final busca secretos antes de entregar. |
| Los datos de un usuario se mezclan con los de otro | Todas las consultas filtran por el usuario del token; hay tests específicos (RN-07). |
