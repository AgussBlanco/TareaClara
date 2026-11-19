import { useState } from "react";
import { useAhora } from "../hooks/useAhora";
import { useTareas } from "../hooks/useTareas";
import { FILTROS_INICIALES, filtrarTareas, type Filtros } from "../lib/filtros";
import { resumirTareas } from "../lib/resumen";
import { materiasDe, ordenarTareas } from "../lib/tareas";
import { almacenamientoPersistente } from "../storage/storage";
import type { UsuarioPublico } from "../types";
import { FiltrosBarra } from "./FiltrosBarra";
import { ResumenTareas } from "./ResumenTareas";
import { TaskCard } from "./TaskCard";
import { TaskForm } from "./TaskForm";

type Vista = "activas" | "ocultas";

interface Props {
  usuario: UsuarioPublico;
  onCerrarSesion: () => void;
}

export function Tablero({ usuario, onCerrarSesion }: Props) {
  const ahora = useAhora();
  const tareas = useTareas(usuario.id);
  const [vista, setVista] = useState<Vista>("activas");
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIALES);
  const [creando, setCreando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const ordenadas = ordenarTareas(tareas.tareas);
  const activas = ordenadas.filter((t) => !t.oculta);
  const ocultas = ordenadas.filter((t) => t.oculta);
  const enVista = vista === "activas" ? activas : ocultas;
  const visibles = filtrarTareas(enVista, filtros);
  const materias = materiasDe(tareas.tareas);
  const resumen = resumirTareas(activas, ahora);

  return (
    <div className="pagina">
      <header className="encabezado">
        <p className="marca">TareaClara</p>
        <div className="encabezado-usuario">
          <span>{usuario.nombre}</span>
          <button type="button" className="boton boton-chico" onClick={onCerrarSesion}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="contenido">
        <h1 className="titulo-pagina">Mis tareas</h1>

        {!almacenamientoPersistente && (
          <p className="aviso aviso-error" role="alert">
            El navegador bloquea el almacenamiento: las tareas se perderán al cerrar la pestaña.
          </p>
        )}
        {tareas.errorGuardado && (
          <p className="aviso aviso-error" role="alert">
            {tareas.errorGuardado}
          </p>
        )}

        <ResumenTareas resumen={resumen} />

        <div className="barra-superior">
          <div className="pestanas" role="group" aria-label="Elegir vista">
            <button type="button" className="pestana" aria-pressed={vista === "activas"} onClick={() => setVista("activas")}>
              Activas ({activas.length})
            </button>
            <button type="button" className="pestana" aria-pressed={vista === "ocultas"} onClick={() => setVista("ocultas")}>
              Ocultas ({ocultas.length})
            </button>
          </div>
          {!creando && (
            <button type="button" className="boton boton-principal" onClick={() => setCreando(true)}>
              Nueva tarea
            </button>
          )}
        </div>

        {creando && (
          <TaskForm
            materias={materias}
            onGuardar={(datos) => {
              tareas.crear(datos);
              setCreando(false);
              setVista("activas");
            }}
            onCancelar={() => setCreando(false)}
          />
        )}

        <FiltrosBarra filtros={filtros} materias={materias} onCambiar={setFiltros} />

        {visibles.length === 0 ? (
          <div className="vacio">
            {enVista.length === 0 ? (
              <p>
                {vista === "activas"
                  ? "Todavía no hay tareas. Crea la primera con «Nueva tarea»."
                  : "No hay tareas ocultas."}
              </p>
            ) : (
              <>
                <p>Ninguna tarea coincide con los filtros.</p>
                <button type="button" className="boton boton-chico" onClick={() => setFiltros(FILTROS_INICIALES)}>
                  Quitar filtros
                </button>
              </>
            )}
          </div>
        ) : (
          <ul className="lista-tareas">
            {visibles.map((tarea) => (
              <li key={tarea.id}>
                {editandoId === tarea.id ? (
                  <TaskForm
                    inicial={tarea}
                    materias={materias}
                    onGuardar={(datos) => {
                      tareas.editar(tarea.id, datos);
                      setEditandoId(null);
                    }}
                    onCancelar={() => setEditandoId(null)}
                  />
                ) : (
                  <TaskCard
                    tarea={tarea}
                    ahora={ahora}
                    onCambiarEstado={tareas.cambiarEstado}
                    onEditar={setEditandoId}
                    onAlternarOculta={tareas.alternarOculta}
                    onEliminar={(id) => {
                      tareas.eliminar(id);
                      setEditandoId((actual) => (actual === id ? null : actual));
                    }}
                    onAgregarMaterial={tareas.agregarMaterial}
                    onQuitarMaterial={tareas.quitarMaterial}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
