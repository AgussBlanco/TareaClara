import { PantallaAcceso } from "./components/PantallaAcceso";
import { Tablero } from "./components/Tablero";
import { useAuth } from "./hooks/useAuth";
import { useLento } from "./hooks/useLento";
import type { Api } from "./lib/api";
import { api, errorDeConfiguracion } from "./lib/cliente";
import { sesion } from "./storage/sesion";

function PantallaMensaje({ titulo, texto, rol }: { titulo: string; texto: string; rol: "status" | "alert" }) {
  return (
    <main className="acceso">
      <section className="hoja acceso-hoja">
        <p className="marca">TareaClara</p>
        <h1>{titulo}</h1>
        <p role={rol}>{texto}</p>
      </section>
    </main>
  );
}

function Aplicacion({ api }: { api: Api }) {
  const { usuario, cargando, registrar, iniciarSesion, cerrarSesion } = useAuth(api, sesion);
  const lento = useLento(cargando);

  if (cargando) {
    return (
      <PantallaMensaje
        titulo="Abriendo tu sesión…"
        texto={
          lento
            ? "El servidor gratuito está despertando; puede tardar hasta un minuto. No cierres la página."
            : "Un momento."
        }
        rol="status"
      />
    );
  }

  if (!usuario) {
    return <PantallaAcceso onRegistrar={registrar} onIniciarSesion={iniciarSesion} />;
  }

  // La "key" reinicia el tablero si cambia el usuario: nunca se mezclan datos de dos cuentas.
  return <Tablero key={usuario.id} api={api} usuario={usuario} onCerrarSesion={cerrarSesion} />;
}

export default function App() {
  if (!api) {
    return (
      <PantallaMensaje
        titulo="Falta configurar la aplicación"
        texto={errorDeConfiguracion ?? "No se pudo configurar la conexión con el servidor."}
        rol="alert"
      />
    );
  }
  return <Aplicacion api={api} />;
}
