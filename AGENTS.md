# AGENTS.md — reglas para agentes de IA en este repositorio

Este archivo se lee antes de tocar nada. Es corto a propósito.

## Cómo trabajar

1. **La spec manda.** El comportamiento está en `docs/spec.md`, con cada regla numerada (`RN-xx`).
   Si el pedido contradice la spec, se frena y se avisa; no se elige un camino en silencio.
2. **Primero la regla, después el test, después el código.** Cada regla nueva o cambiada se escribe en la spec,
   se escribe el test y recién entonces el código.
3. **Una tarea, un commit.** Las tareas están en `docs/tareas.md`. Cada una termina con sus tests pasando
   y con un commit propio cuyo mensaje empieza con el número de la tarea (por ejemplo `T05: ...`).
   Al terminarla se marca `[x]` en `docs/tareas.md` dentro del mismo commit.
4. **Nombre de los tests.** El nombre del test empieza con el número de la regla que comprueba:
   `it("RN-08: rechaza un título vacío", ...)`.
5. **Cambios chicos.** No se refactoriza ni se renombra nada que la tarea no pida.

## Qué no se toca sin permiso expreso

- Las reglas de `docs/spec.md` (se cambian solo si el pedido lo dice).
- Las migraciones ya aplicadas en `backend/migrations/`: para cambiar la base se agrega una migración nueva.
- La capa de capas del backend: **Controlador → Servicio → Repositorio**. El SQL vive solo en `backend/src/repositorios`;
  las reglas de negocio solo en `backend/src/servicios`; el controlador solo lee la petición y arma la respuesta.
- La lógica pura del frontend en `frontend/src/lib` no importa React ni `fetch`.
- Los límites repetidos en frontend y backend (`LIMITES`) deben cambiar siempre juntos.

## Seguridad

- **Nunca** se escribe un secreto en el repositorio: ni claves, ni contraseñas, ni cadenas de conexión, ni tokens.
  Los valores reales van en variables de entorno; en el repo solo hay `.env.example` con valores de ejemplo.
- Todo SQL usa parámetros (`$1`, `$2`). No se arma SQL pegando texto del usuario.
- Las respuestas nunca incluyen el hash de la contraseña.
- El dueño de una tarea sale del token, nunca del cuerpo de la petición.
- Si un test necesita una clave, usa una de prueba escrita dentro del propio test.

## Comandos

```bash
# Backend
cd backend && npm install && npm test && npm run typecheck && npm run build
# Frontend
cd frontend && npm install && npm test && npm run build
```

Requiere Node.js 22.12 o superior. Antes de dar una tarea por terminada, `npm test` y `npm run typecheck`
tienen que pasar en la carpeta que se tocó.

## Estilo

- TypeScript estricto. Nombres de dominio en español (`tarea`, `fechaLimite`), nombres técnicos en inglés cuando son estándar (`token`, `middleware`).
- Los textos que ve el usuario están en español rioplatense neutro, sin jerga.
- Cada error de validación dice qué campo falló y cómo corregirlo.
