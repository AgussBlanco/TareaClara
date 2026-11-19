# TareaClara

Organizador de tareas para estudiantes: fechas límite, estados, prioridad, nota y material de estudio.

El proyecto tiene dos partes que todavía **no están conectadas entre sí**:

| Carpeta | Qué es | Estado |
|---|---|---|
| `frontend/` | App web en React + Vite + TypeScript. Guarda todo en `localStorage` y tiene login local. | Completa |
| `backend/` | API en Node + Express + TypeScript + SQLite, con arquitectura Controller / Service / Repository. | Una funcionalidad implementada: crear tarea (y listar para comprobarla) |

## Requisitos

Node.js 22.12 o superior y npm.

## Frontend

```bash
cd frontend
npm install
npm run dev        # abre http://localhost:5173
npm test           # tests de la lógica
npm run build      # revisa los tipos y genera la versión de producción
```

La app debe abrirse desde `localhost` o `https`: las contraseñas se protegen con la API de cifrado del
navegador, que no funciona en otras direcciones `http`.

## Backend

```bash
cd backend
npm install
npm run seed       # crea dos usuarios de prueba: usuario-ana y usuario-luis
npm run dev        # API en http://localhost:3000
npm test           # tests unitarios, de base de datos y HTTP
```

Probar la funcionalidad implementada:

```bash
curl -X POST http://localhost:3000/api/tareas \
  -H "Content-Type: application/json" -H "X-Usuario-Id: usuario-ana" \
  -d '{"titulo":"TP de funciones","materia":"Matemática","fechaLimite":"2026-12-01","prioridad":"Alta"}'

curl http://localhost:3000/api/tareas -H "X-Usuario-Id: usuario-ana"
```

Variables opcionales: `PORT` (3000 por defecto) y `DB_PATH` (`data/tareaclara.db` por defecto).

> El encabezado `X-Usuario-Id` es una identificación **temporal e insegura**, solo para desarrollar
> hasta que existan el registro y el inicio de sesión. Ver `backend/src/middlewares/identificarUsuario.ts`.
