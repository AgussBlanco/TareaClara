# TareaClara

Aplicación web para que estudiantes organicen sus tareas: fecha límite, estado, prioridad, nota y material de estudio, con un resumen de lo que está vencido o por vencer. Cada estudiante tiene su cuenta y sus datos viven en el servidor, así que los ve desde cualquier dispositivo.

Proyecto final de la Generación T.


## Qué incluye

- Registro e inicio de sesión.
- Tareas con título, materia, fecha límite, prioridad, descripción y nota opcional.
- Estados «No completada», «En proceso» y «Completada»; ocultar y eliminar tareas.
- Material de estudio por tarea (enlaces y apuntes).
- Urgencia por día de calendario, orden por vencimiento, filtros, búsqueda y resumen.
- Funciona en celular.

## Tecnologías

| Parte | Tecnología |
|---|---|
| Frontend | React 19, Vite, TypeScript → Netlify |
| Backend | Node ≥ 22.12, Express 5, TypeScript (capas Controlador → Servicio → Repositorio) → Render |
| Base de datos | PostgreSQL (driver `pg`, migraciones propias) → Neon |
| Pruebas | vitest, PGlite (PostgreSQL en memoria), Playwright |

## Estructura del repositorio

```
backend/      API y migraciones SQL         (Node + Express + PostgreSQL)
frontend/     Aplicación web                (React + Vite)
e2e/          Recorrido completo en navegador (Playwright)
docs/         Especificación, plan, tareas, relevamiento, manuales, informe de pruebas, guía de despliegue
AGENTS.md     Reglas para agentes de IA que trabajen en el repositorio
render.yaml   Blueprint de Render para el backend
```

## Documentación

| Documento | Para qué |
|---|---|
| [`docs/relevamiento.md`](docs/relevamiento.md) | Problema, usuarios, requisitos, casos de uso y modelo de datos |
| [`docs/spec.md`](docs/spec.md) | Reglas de negocio numeradas (RN-01 a RN-34), API y pantallas |
| [`docs/plan.md`](docs/plan.md) | Decisiones técnicas, arquitectura y riesgos |
| [`docs/tareas.md`](docs/tareas.md) | Lista de tareas del proyecto (una por commit) |
| [`docs/informe-de-pruebas.md`](docs/informe-de-pruebas.md) | Resultados de las pruebas y matriz de trazabilidad regla → test |
| [`docs/manual-de-usuario.md`](docs/manual-de-usuario.md) | Cómo usar la aplicación |
| [`docs/manual-tecnico.md`](docs/manual-tecnico.md) | Arquitectura, base de datos, API, seguridad, configuración y mantenimiento |
| [`AGENTS.md`](AGENTS.md) | Reglas para agentes de IA |

## Probarla en tu computadora

Requisitos: Node.js 22.12 o superior y npm.

**Solo las pruebas** (no necesitan base de datos ni variables de entorno):

```bash
cd backend  && npm ci && npm test
cd frontend && npm ci && npm test
```

**La aplicación completa** necesita una base PostgreSQL (por ejemplo una gratuita de Neon):

```bash
# 1. Backend
cd backend
cp .env.example .env      # completar DATABASE_URL y JWT_SECRET; .env no se sube a Git
npm ci
npm run dev               # http://localhost:3000

# 2. Frontend (otra terminal)
cd frontend
npm ci
npm run dev               # http://localhost:5173
```

Las variables de entorno están explicadas en `docs/manual-tecnico.md`, sección 5.

## Seguridad y secretos

El repositorio no contiene claves, contraseñas ni cadenas de conexión: la configuración va en variables de entorno y solo se versionan los archivos `.env.example`. Los archivos `.env` están en `.gitignore`.

## Estado

Las 15 tareas de `docs/tareas.md` están terminadas. 196 pruebas del backend, 80 del frontend y 44 comprobaciones de punta a punta pasan; las 34 reglas de negocio están cubiertas (ver el informe de pruebas). Limitaciones conocidas en `docs/manual-tecnico.md`, sección 9.
