# Guía de despliegue — TareaClara

Cómo publicar la aplicación en internet con tres servicios gratuitos, en este orden:

| Orden | Servicio | Qué aloja | Qué te da |
|---|---|---|---|
| 1 | GitHub | El código | El enlace del repositorio público para la entrega |
| 2 | Neon | La base PostgreSQL | La cadena `DATABASE_URL` |
| 3 | Render | El backend (API) | La dirección de la API |
| 4 | Netlify | El frontend | La dirección pública de la aplicación |

Tiempo estimado: 30 a 40 minutos. Las pantallas de cada servicio pueden cambiar de nombre o de lugar; lo importante son los valores que se copian entre uno y otro.

> **Regla de oro:** `DATABASE_URL` y `JWT_SECRET` son secretos. Se pegan solo en los paneles de Render (y los que pide cada servicio), **nunca** en un archivo del repositorio, en el chat ni en una captura que vayas a entregar.

## Antes de empezar

- Una cuenta en cada uno de los cuatro servicios (se puede entrar con la cuenta de GitHub en Netlify y Render).
- Git instalado y la carpeta del proyecto descomprimida.

## 1. Subir el código a GitHub

1. En GitHub, **New repository**: nombre `tareaclara`, visibilidad **Public**, **sin** README, `.gitignore` ni licencia (el proyecto ya los trae).
2. En una terminal, dentro de la carpeta del proyecto:

```bash
git status                       # debe decir "nothing to commit, working tree clean"
git branch -M main
git remote add origin https://github.com/<tu-usuario>/tareaclara.git
git push -u origin main
```

3. Actualizá la página del repositorio: tienen que verse `backend/`, `frontend/`, `docs/`, `AGENTS.md`, `README.md` y `render.yaml`.
4. **Control de secretos.** Verificá que **no** aparezca ningún archivo `.env` y que `backend/.env.example` y `frontend/.env.example` tengan solo valores de ejemplo.

Los commits del historial tienen como autor `TareaClara Dev` (un nombre de ejemplo). Si querés que figure tu nombre en los commits **nuevos**, configuralo antes de seguir trabajando: `git config user.name "Tu Nombre"` y `git config user.email "tu-email"`. Los commits viejos no cambian; reescribirlos no hace falta.

El enlace del repositorio (`https://github.com/<tu-usuario>/tareaclara`) es el que se sube al campus.

## 2. Crear la base de datos en Neon

1. En Neon, **Create project**: nombre `tareaclara`, la versión de PostgreSQL por defecto y la región más cercana disponible.
2. En el panel del proyecto, botón **Connect**: copiá la **connection string**. Tiene esta forma:

```
postgresql://usuario:contraseña@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require
```

3. Guardala en un lugar privado (un gestor de contraseñas o un archivo fuera del repositorio). Se pega en el paso 3.

No hace falta crear tablas: la API las crea sola la primera vez que arranca (migraciones).

## 3. Publicar el backend en Render

1. En Render: **New → Blueprint**, conectá tu cuenta de GitHub y elegí el repositorio `tareaclara`. Render lee `render.yaml` y propone el servicio `tareaclara-api` (plan **Free**, carpeta `backend`).
2. Render te pide los valores de las variables que no están en el archivo:

| Variable | Qué poner |
|---|---|
| `DATABASE_URL` | La cadena de Neon del paso 2, completa (con `?sslmode=require`) |
| `CORS_ORIGINS` | Por ahora poné `https://pendiente.netlify.app`; se corrige en el paso 5 |

   `JWT_SECRET` se genera solo (no tenés que inventar nada) y `NODE_ENV` ya viene en `production`.

3. Aplicá el Blueprint y esperá el primer despliegue (varios minutos). En los **Logs** tiene que aparecer `Migraciones aplicadas: 001_inicial.sql` y `API de TareaClara escuchando en el puerto …`.
4. Copiá la dirección pública del servicio (algo como `https://tareaclara-api.onrender.com`) y comprobala en el navegador:

```
https://tareaclara-api.onrender.com/api/salud      →  {"estado":"ok"}
```

Si responde `503 BASE_NO_DISPONIBLE`, revisá `DATABASE_URL`. Si el servicio no arranca, los Logs dicen qué variable falta.

## 4. Publicar el frontend en Netlify

1. En Netlify: **Add new site → Import an existing project**, elegí GitHub y el repositorio `tareaclara`.
2. Configuración de compilación:

| Campo | Valor |
|---|---|
| Base directory | `frontend` |
| Build command | `npm run build` (ya está en `frontend/netlify.toml`) |
| Publish directory | `dist` (también está en `netlify.toml`; si el campo pide la ruta completa, `frontend/dist`) |

3. En **Environment variables** agregá:

| Variable | Valor |
|---|---|
| `VITE_API_URL` | La dirección de la API del paso 3, **sin barra final**: `https://tareaclara-api.onrender.com` |

   Esta variable se incorpora al **compilar**: si la cambiás después, hay que volver a desplegar el sitio (*Deploys → Trigger deploy*).

4. **Deploy**. Cuando termine, copiá la dirección del sitio (algo como `https://tareaclara.netlify.app`). Podés cambiarla en *Site configuration → Change site name*.

## 5. Conectar el frontend con el backend (CORS)

La API solo acepta pedidos desde las direcciones que figuran en `CORS_ORIGINS`.

1. En Render, abrí el servicio → **Environment** → editá `CORS_ORIGINS` y poné la dirección exacta de Netlify, **sin barra final**: `https://tareaclara.netlify.app`. Si usás más de una dirección, separalas con coma.
2. Guardá. Render reinicia el servicio solo.

## 6. Verificación final

Con las direcciones públicas, seguí la lista de la sección 8 de `docs/informe-de-pruebas.md`:

- [ ] `https://<api>/api/salud` responde `{"estado":"ok"}`.
- [ ] El sitio de Netlify muestra «Ingresar» (no «Falta configurar la aplicación»).
- [ ] Crear una cuenta y entrar.
- [ ] Crear una tarea, cambiar su estado, agregar material, ocultarla y eliminarla.
- [ ] Recargar: la sesión y las tareas siguen.
- [ ] Desde el celular, con la misma cuenta, se ven las mismas tareas.

**Para la entrega:** el enlace de la aplicación (Netlify), el de la API (`/api/salud`) y el del repositorio (GitHub).

> **Antes de presentar:** el plan gratuito de Render duerme el servicio tras 15 minutos sin uso y la primera visita tarda cerca de un minuto. Abrí el sitio unos minutos antes de la presentación para despertarlo.

## Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| El sitio dice «Falta configurar la aplicación» | `VITE_API_URL` no estaba al compilar | Agregarla en Netlify y volver a desplegar |
| Al ingresar: «No se pudo conectar con el servidor» | API dormida, dirección mal escrita en `VITE_API_URL`, o `CORS_ORIGINS` no coincide | Probar `/api/salud`; revisar que ambas direcciones sean exactas y sin barra final; en la consola del navegador (F12) un error de CORS confirma la tercera causa |
| Render falla en el build | Versión de Node o dependencias | Verificar `NODE_VERSION` = 22.12.0 en el Environment |
| Logs: «La base de datos todavía no responde» | Neon está despertando | El servicio reintenta 6 veces; si sigue, revisar `DATABASE_URL` |
| Logs: `JWT_SECRET` o `CORS_ORIGINS` faltante | Variable sin cargar | Cargarla en Render → Environment |
| Al navegar a una ruta y recargar, Netlify da 404 | Falta la redirección de página única | Está en `frontend/netlify.toml`; comprobar que Base directory sea `frontend` |
| Error 429 al ingresar | Más de 10 intentos en 15 minutos desde la misma IP | Esperar |

## Actualizar la aplicación

Cada `git push` a `main` vuelve a desplegar Netlify y Render automáticamente. Si agregás una migración nueva (`backend/migrations/002_….sql`), se aplica sola cuando el backend arranca.
