// Recorrido de punta a punta: navegador real + frontend + API + base PostgreSQL.
// Uso: node e2e/recorrido.mjs <url-del-frontend> <carpeta-de-capturas>   (ver docs/informe-de-pruebas.md)
// Necesita Playwright instalado; si no se resuelve como "playwright", indicá la ruta en PLAYWRIGHT.
const { chromium } = await import(process.env.PLAYWRIGHT ?? "playwright");

const URL = process.argv[2];
const S = process.argv[3] ?? ".";
const ZONA = "America/Argentina/Buenos_Aires";

const base = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date()); // YYYY-MM-DD de hoy en Buenos Aires
const enDias = (n) => {
  const [a, m, d] = base.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
};

const resultados = [];
function check(nombre, condicion, detalle = "") {
  resultados.push({ nombre, ok: Boolean(condicion) });
  console.log(`${condicion ? "PASS" : "FAIL"}  ${nombre}${condicion ? "" : "  -> " + detalle}`);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, locale: "es-AR", timezoneId: ZONA });
const page = await ctx.newPage();
const errores = [];
page.on("pageerror", (e) => errores.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error" && !/fonts\.g|ERR_|Failed to load resource/i.test(m.text())) errores.push(m.text());
});

// Repite la comprobación hasta que se cumpla (la API responde de forma asíncrona).
async function esperar(fn, ms = 5000) {
  const limite = Date.now() + ms;
  let valor = false;
  while (Date.now() < limite) {
    valor = await fn();
    if (valor) return valor;
    await page.waitForTimeout(100);
  }
  return valor;
}
const reposo = () => page.waitForLoadState("networkidle");
const tarjeta = (titulo) => page.locator("article", { hasText: titulo });
const titulos = () => page.locator("article h3").allInnerTexts();
const botonRegistrar = () => page.locator("form button[type=submit]");

async function crear(t) {
  await page.getByRole("button", { name: "Nueva tarea" }).click();
  const f = page.getByRole("form", { name: "Nueva tarea" });
  await f.getByLabel("Título").fill(t.titulo);
  await f.getByLabel("Materia").fill(t.materia);
  await f.getByLabel("Fecha límite").fill(t.fecha);
  await f.getByLabel("Prioridad").selectOption(t.prioridad);
  if (t.descripcion) await f.getByLabel("Descripción (opcional)").fill(t.descripcion);
  await f.getByRole("button", { name: "Crear tarea" }).click();
  await reposo();
}

async function ingresar(email, clave) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(clave);
  await botonRegistrar().click();
}

// ---------- Acceso y registro ----------
await page.goto(URL);
await page.getByRole("heading", { name: "Ingresar" }).waitFor();
await page.screenshot({ path: `${S}/01-acceso.png` });

await page.getByRole("group", { name: "Elegir acción" }).getByRole("button", { name: "Crear cuenta" }).click();
await botonRegistrar().click();
check("registro vacío muestra errores de validación", await esperar(() => page.getByText("El email no es válido.").isVisible()), await page.locator("form").innerText());

await page.getByLabel("Nombre").fill("Ana Pérez");
await ingresar("ana@correo.com", "secreta123");
await page.getByRole("heading", { name: "Mis tareas" }).waitFor();
check("al registrarse entra al tablero con el nombre", await page.getByText("Ana Pérez").isVisible());
check("sin tareas muestra el estado vacío", await esperar(() => page.getByText("Todavía no hay tareas.").isVisible()));

// ---------- Crear tareas ----------
await page.getByRole("button", { name: "Nueva tarea" }).click();
await page.getByRole("form", { name: "Nueva tarea" }).getByRole("button", { name: "Crear tarea" }).click();
await reposo();
check("formulario vacío marca título, materia y fecha", (await page.getByText("El título es obligatorio.").isVisible()) && (await page.getByText("La materia es obligatoria.").isVisible()) && (await page.getByText("La fecha límite es obligatoria.").isVisible()));
await page.getByRole("form", { name: "Nueva tarea" }).getByRole("button", { name: "Cancelar" }).click();

await crear({ titulo: "Informe de laboratorio", materia: "Física", fecha: enDias(-3), prioridad: "Media", descripcion: "Entregar impreso." });
await crear({ titulo: "TP de funciones", materia: "Matemática", fecha: enDias(2), prioridad: "Alta" });
await crear({ titulo: "Resumen de la Revolución", materia: "Historia", fecha: enDias(3), prioridad: "Media" });
await crear({ titulo: "Lectura de Borges", materia: "Lengua", fecha: enDias(12), prioridad: "Baja" });
await crear({ titulo: "Guía de ejercicios", materia: "Matemática", fecha: enDias(1), prioridad: "Baja" });

check("hay 5 tareas", await esperar(async () => (await titulos()).length === 5));
check("vencida: texto correcto", await tarjeta("Informe de laboratorio").getByText("Vencida hace 3 días").isVisible());
check("próxima con prioridad alta: texto correcto", await tarjeta("TP de funciones").getByText("Vence en 2 días").isVisible());
check("lejana: texto correcto", await tarjeta("Lectura de Borges").getByText("Faltan 12 días").isVisible());
check("margen rojo en la crítica", await tarjeta("TP de funciones").evaluate((e) => e.classList.contains("nivel-critico")));
check("margen resaltador en la de atención", await tarjeta("Resumen de la Revolución").evaluate((e) => e.classList.contains("nivel-atencion")));

// ---------- Estado, nota, material ----------
await tarjeta("Guía de ejercicios").getByLabel("Estado").selectOption("Completada");
await reposo();
check("completar mueve la tarea al final", await esperar(async () => (await titulos()).at(-1) === "Guía de ejercicios"), (await titulos()).join(" | "));
check("orden por fecha límite", (await titulos()).slice(0, 4).join(" | ") === "Informe de laboratorio | TP de funciones | Resumen de la Revolución | Lectura de Borges", (await titulos()).join(" | "));
check("resumen: 1 completada", (await page.locator(".resumen-completadas dd").innerText()) === "1");
check("resumen: 1 vencida", (await page.locator(".resumen-vencidas dd").innerText()) === "1");
check("resumen: 2 próximas", (await page.locator(".resumen-proximas dd").innerText()) === "2");

await tarjeta("TP de funciones").getByRole("button", { name: "Editar" }).click();
const edicion = page.getByRole("form", { name: "Editar tarea" });
await edicion.getByLabel("Nota (opcional)").fill("11");
await edicion.getByRole("button", { name: "Guardar cambios" }).click();
await reposo();
check("nota fuera de rango se rechaza", await page.getByText("La nota debe ser un número entre 0 y 10").isVisible());
await edicion.getByLabel("Nota (opcional)").fill("8,5");
await edicion.getByRole("button", { name: "Guardar cambios" }).click();
await reposo();
check("nota 8,5 se guarda y se muestra", await esperar(() => tarjeta("TP de funciones").getByText("Nota: 8,5").isVisible()));

await tarjeta("TP de funciones").getByRole("button", { name: /Material de estudio/ }).click();
const material = tarjeta("TP de funciones").getByRole("form", { name: "Agregar material de estudio" });
await material.getByLabel("Título").fill("Guía de la cátedra");
await material.getByLabel("Enlace").fill("javascript:alert(1)");
await material.getByRole("button", { name: "Agregar material" }).click();
await reposo();
check("enlace peligroso (javascript:) se rechaza", await page.getByText("El enlace debe empezar con http:// o https://.").isVisible());
await material.getByLabel("Enlace").fill("https://ejemplo.com/guia");
await material.getByRole("button", { name: "Agregar material" }).click();
await reposo();
const enlace = tarjeta("TP de funciones").getByRole("link", { name: "Guía de la cátedra" });
check("el enlace de material se muestra con href y rel seguro", (await enlace.getAttribute("href")) === "https://ejemplo.com/guia" && (await enlace.getAttribute("rel")) === "noopener noreferrer");
check("el contador del botón de material sube a 1", await tarjeta("TP de funciones").getByRole("button", { name: "Material de estudio (1)" }).isVisible());

await page.screenshot({ path: `${S}/02-tablero.png`, fullPage: true });

// ---------- Ocultar, filtros, eliminar ----------
await tarjeta("Lectura de Borges").getByRole("button", { name: "Ocultar" }).click();
await reposo();
check("ocultar saca la tarea de Activas", await esperar(async () => (await titulos()).length === 4 && (await page.getByRole("button", { name: "Activas (4)" }).isVisible())));
await page.getByRole("button", { name: "Ocultas (1)" }).click();
check("la tarea oculta aparece en Ocultas", (await titulos()).join() === "Lectura de Borges");
await page.getByRole("button", { name: "Activas (4)" }).click();

await page.getByLabel("Buscar por título").fill("revolucion");
check("búsqueda sin tildes ni mayúsculas", (await titulos()).join() === "Resumen de la Revolución");
await page.getByLabel("Buscar por título").fill("zzz");
check("sin coincidencias muestra mensaje", await page.getByText("Ninguna tarea coincide con los filtros.").isVisible());
await page.getByRole("button", { name: "Quitar filtros" }).first().click();
await page.getByLabel("Materia").last().selectOption("Matemática");
check("filtro por materia", (await titulos()).length === 2);
await page.getByRole("button", { name: "Quitar filtros" }).click();

await tarjeta("Guía de ejercicios").getByRole("button", { name: "Eliminar" }).click();
await tarjeta("Guía de ejercicios").getByRole("button", { name: "Cancelar" }).click();
check("cancelar la eliminación conserva la tarea", (await titulos()).includes("Guía de ejercicios"));
await tarjeta("Guía de ejercicios").getByRole("button", { name: "Eliminar" }).click();
await tarjeta("Guía de ejercicios").getByRole("button", { name: "Sí, eliminar" }).click();
await reposo();
check("confirmar elimina la tarea", await esperar(async () => !(await titulos()).includes("Guía de ejercicios") && (await titulos()).length === 3));

// ---------- Persistencia en el servidor ----------
await page.reload();
await page.getByRole("heading", { name: "Mis tareas" }).waitFor();
check("tras recargar la sesión sigue abierta", await page.getByText("Ana Pérez").isVisible());
check("tras recargar las tareas persisten", (await titulos()).length === 3 && (await page.getByRole("button", { name: "Ocultas (1)" }).isVisible()));
const almacen = await page.evaluate(() => ({
  claves: Object.keys(localStorage).sort(),
  todo: JSON.stringify(Object.entries(localStorage)),
}));
check("en el navegador solo se guarda el token", almacen.claves.join() === "tareaclara:token", almacen.claves.join());
check("la contraseña no queda en el navegador", !almacen.todo.includes("secreta123"));

// Otro dispositivo: contexto nuevo, sin nada guardado
const otro = await browser.newContext({ viewport: { width: 1280, height: 1000 }, locale: "es-AR", timezoneId: ZONA });
const p2 = await otro.newPage();
await p2.goto(URL);
await p2.getByLabel("Email").fill("ana@correo.com");
await p2.getByLabel("Contraseña", { exact: true }).fill("secreta123");
await p2.locator("form button[type=submit]").click();
await p2.getByRole("heading", { name: "Mis tareas" }).waitFor();
check("desde otro navegador se ven las mismas tareas (viven en el servidor)", (await p2.locator("article h3").count()) === 3);
await otro.close();

// ---------- Sesión y aislamiento entre usuarios ----------
await page.getByRole("button", { name: "Cerrar sesión" }).click();
await page.getByRole("heading", { name: "Ingresar" }).waitFor();
check("cerrar sesión borra el token", (await page.evaluate(() => localStorage.getItem("tareaclara:token"))) === null);
await ingresar("ana@correo.com", "incorrecta");
check("login con contraseña incorrecta muestra el error del servidor", await page.getByText("El email o la contraseña no son correctos.").waitFor({ timeout: 8000 }).then(() => true, () => false));
await ingresar("ANA@correo.com", "secreta123");
await page.getByRole("heading", { name: "Mis tareas" }).waitFor();
check("login correcto (email sin distinguir mayúsculas) recupera las tareas", (await titulos()).length === 3);

await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: `${S}/03-movil.png`, fullPage: true });
check("en pantalla de 390px no hay desborde horizontal", !(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
await page.setViewportSize({ width: 1280, height: 1000 });

// RN-34: token inválido -> el servidor responde 401 y la app vuelve al acceso
await page.evaluate(() => localStorage.setItem("tareaclara:token", "token.invalido.xxx"));
await page.reload();
await page.getByRole("heading", { name: "Ingresar" }).waitFor();
check("RN-34: con un token inválido la app vuelve a la pantalla de acceso", true);
check("RN-34: el token inválido se borra", (await page.evaluate(() => localStorage.getItem("tareaclara:token"))) === null);

await page.getByRole("group", { name: "Elegir acción" }).getByRole("button", { name: "Crear cuenta" }).click();
await page.getByLabel("Nombre").fill("Luis Gómez");
await ingresar("luis@correo.com", "otraclave1");
await page.getByRole("heading", { name: "Mis tareas" }).waitFor();
check("otro usuario no ve las tareas de Ana", (await titulos()).length === 0 && (await page.getByText("Todavía no hay tareas.").isVisible()));
await page.getByRole("button", { name: "Cerrar sesión" }).click();
await page.getByRole("group", { name: "Elegir acción" }).getByRole("button", { name: "Crear cuenta" }).click();
await page.getByLabel("Nombre").fill("Otra Ana");
await ingresar("ana@correo.com", "clave-nueva1");
check("no se puede registrar un email repetido (error del servidor)", await page.getByText("Ya existe una cuenta con ese email.").waitFor({ timeout: 8000 }).then(() => true, () => false));

// ---------- Servidor caído ----------
await page.getByRole("group", { name: "Elegir acción" }).getByRole("button", { name: "Ingresar" }).click();
await ingresar("ana@correo.com", "secreta123");
await page.getByRole("heading", { name: "Mis tareas" }).waitFor();
await ctx.setOffline(true);
await tarjeta("TP de funciones").getByLabel("Estado").selectOption("En proceso");
await reposo();
check("sin conexión se avisa y no se cambia nada en pantalla", await page.getByText("No se pudo conectar con el servidor").waitFor({ timeout: 8000 }).then(() => true, () => false));
check("sin conexión el estado en pantalla vuelve al valor guardado", (await tarjeta("TP de funciones").getByLabel("Estado").inputValue()) === "No completada");
await ctx.setOffline(false);
await tarjeta("TP de funciones").getByLabel("Estado").selectOption("En proceso");
await reposo();
await page.waitForFunction(() => !document.body.innerText.includes("No se pudo conectar"));
check("al volver la conexión el cambio se guarda", await esperar(async () => (await tarjeta("TP de funciones").getByLabel("Estado").inputValue()) === "En proceso"));

check("sin errores inesperados en la consola del navegador", errores.length === 0, errores.join(" || "));

await browser.close();
const fallos = resultados.filter((r) => !r.ok).length;
console.log(`\n${resultados.length - fallos}/${resultados.length} comprobaciones correctas`);
process.exit(fallos === 0 ? 0 : 1);
