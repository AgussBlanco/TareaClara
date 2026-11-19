import { useState, type FormEvent } from "react";
import type { ResultadoAcceso } from "../hooks/useAuth";
import type { BorradorLogin, BorradorRegistro, Errores } from "../lib/validaciones";
import { Campo, propsDeError } from "./Campo";

interface Props {
  onRegistrar: (borrador: BorradorRegistro) => Promise<ResultadoAcceso>;
  onIniciarSesion: (borrador: BorradorLogin) => Promise<ResultadoAcceso>;
}

type Modo = "ingresar" | "registrar";

export function PantallaAcceso({ onRegistrar, onIniciarSesion }: Props) {
  const [modo, setModo] = useState<Modo>("ingresar");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);

  function cambiarModo(nuevo: Modo) {
    setModo(nuevo);
    setErrores({});
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setErrores({});
    const resultado =
      modo === "registrar"
        ? await onRegistrar({ nombre, email, contrasena })
        : await onIniciarSesion({ email, contrasena });
    setEnviando(false);
    if (!resultado.ok) {
      setErrores(resultado.errores);
    }
  }

  const registrando = modo === "registrar";

  return (
    <main className="acceso">
      <section className="hoja acceso-hoja" aria-labelledby="titulo-acceso">
        <p className="marca">TareaClara</p>
        <h1 id="titulo-acceso">{registrando ? "Crear cuenta" : "Ingresar"}</h1>
        <p className="acceso-intro">
          Registra tus entregas, notas y material de estudio. Los datos se guardan solo en este
          navegador.
        </p>

        <div className="pestanas" role="group" aria-label="Elegir acción">
          <button
            type="button"
            className="pestana"
            aria-pressed={!registrando}
            onClick={() => cambiarModo("ingresar")}
          >
            Ingresar
          </button>
          <button
            type="button"
            className="pestana"
            aria-pressed={registrando}
            onClick={() => cambiarModo("registrar")}
          >
            Crear cuenta
          </button>
        </div>

        <form onSubmit={enviar} noValidate>
          {registrando && (
            <Campo id="acceso-nombre" etiqueta="Nombre" error={errores.nombre}>
              <input
                {...propsDeError("acceso-nombre", errores.nombre)}
                type="text"
                autoComplete="name"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </Campo>
          )}
          <Campo id="acceso-email" etiqueta="Email" error={errores.email}>
            <input
              {...propsDeError("acceso-email", errores.email)}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Campo>
          <Campo
            id="acceso-contrasena"
            etiqueta="Contraseña"
            error={errores.contrasena}
            ayuda={registrando ? "Mínimo 6 caracteres." : undefined}
          >
            <input
              {...propsDeError("acceso-contrasena", errores.contrasena)}
              type="password"
              autoComplete={registrando ? "new-password" : "current-password"}
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
            />
          </Campo>

          {errores.general && (
            <p className="aviso aviso-error" role="alert">
              {errores.general}
            </p>
          )}

          <button type="submit" className="boton boton-principal boton-ancho" disabled={enviando}>
            {enviando ? "Procesando…" : registrando ? "Crear cuenta" : "Ingresar"}
          </button>
        </form>
      </section>
    </main>
  );
}
