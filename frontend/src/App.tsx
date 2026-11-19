import { PantallaAcceso } from "./components/PantallaAcceso";
import { Tablero } from "./components/Tablero";
import { useAuth } from "./hooks/useAuth";

export default function App() {
  const { usuario, registrar, iniciarSesion, cerrarSesion } = useAuth();

  if (!usuario) {
    return <PantallaAcceso onRegistrar={registrar} onIniciarSesion={iniciarSesion} />;
  }

  // La "key" reinicia el tablero si cambia el usuario: nunca se mezclan datos de dos cuentas.
  return <Tablero key={usuario.id} usuario={usuario} onCerrarSesion={cerrarSesion} />;
}
