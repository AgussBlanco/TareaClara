import { useState } from "react";
import { useAhora } from "../hooks/useAhora";
import { useTareas } from "../hooks/useTareas";
import { FILTROS_INICIALES, filtrarTareas, type Filtros } from "../lib/filtros";
import { resumirTareas } from "../lib/resumen";
import { materiasDe, ordenarTareas } from "../lib/tareas";
import { useLento } from "../hooks/useLento";
import type { Api } from "../lib/api";
import type { Usuario } from "../types";
import { FiltrosBarra } from "./FiltrosBarra";
import { ResumenTareas } from "./ResumenTareas";
import { TaskCard } from "./TaskCard";
import { TaskForm } from "./TaskForm";

type Vista = "activas" | "ocultas";

interface Props {
  api: Api;
  usuario: Usuario;
  onCerrarSesion: () => void;
}

export function Tablero({ api, usuario, onCerrarSesion }: Props) {
  const ahora = useAhora();
  const tareas = useTareas(api);
  const lento = useLento(tareas.cargando || tareas.guardando);
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

        {lento && (
          <p className="aviso" role="status">
            El servidor gratuito está despertando; puede tardar hasta un minuto. No cierres la página.
          </p>
        )}
        {tareas.error && (
          <p className="aviso aviso-error" role="alert">
            {tareas.error}{" "}
            {tareas.tareas.length === 0 && (
              <button type="button" className="boton boton-chico" onClick={() => void tareas.recargar()}>
                Reintentar
              </button>
            )}
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
            guardando={tareas.guardando}
            onGuardar={async (datos) => {
              const ok = await tareas.crear(datos);
              if (ok) {
                setCreando(false);
                setVista("activas");
              }
              return ok;
            }}
            onCancelar={() => setCreando(false)}
          />
        )}

        <FiltrosBarra filtros={filtros} materias={materias} onCambiar={setFiltros} />

        {tareas.cargando ? (
          <div className="vacio" role="status">
            <p>Cargando tus tareas…</p>
          </div>
        ) : visibles.length === 0 ? (
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
                    guardando={tareas.guardando}
                    onGuardar={async (datos) => {
                      const ok = await tareas.editar(tarea.id, datos);
                      if (ok) {
                        setEditandoId(null);
                      }
                      return ok;
                    }}
                    onCancelar={() => setEditandoId(null)}
                  />
                ) : (
                  <TaskCard
                    tarea={tarea}
                    ahora={ahora}
                    ocupado={tareas.guardando}
                    onCambiarEstado={tareas.cambiarEstado}
                    onEditar={setEditandoId}
                    onAlternarOculta={(t) => tareas.cambiarOculta(t.id, !t.oculta)}
                    onEliminar={async (id) => {
                      const ok = await tareas.eliminar(id);
                      if (ok) {
                        setEditandoId((actual) => (actual === id ? null : actual));
                      }
                      return ok;
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
