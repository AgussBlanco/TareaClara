import { useState } from "react";
import { calcularEstadoVencimiento } from "../lib/vencimiento";
import { describirVencimiento, formatearFechaLimite } from "../lib/textosVencimiento";
import { ESTADOS, type EstadoTarea, type MaterialEstudio, type Tarea } from "../types";
import { MaterialPanel } from "./MaterialPanel";

interface Props {
  tarea: Tarea;
  ahora: Date;
  onCambiarEstado: (id: string, estado: EstadoTarea) => void;
  onEditar: (id: string) => void;
  onAlternarOculta: (id: string) => void;
  onEliminar: (id: string) => void;
  onAgregarMaterial: (id: string, material: Omit<MaterialEstudio, "id">) => void;
  onQuitarMaterial: (id: string, materialId: string) => void;
}

function formatearNota(nota: number): string {
  return nota.toLocaleString("es-AR", { maximumFractionDigits: 2 });
}

export function TaskCard({
  tarea,
  ahora,
  onCambiarEstado,
  onEditar,
  onAlternarOculta,
  onEliminar,
  onAgregarMaterial,
  onQuitarMaterial,
}: Props) {
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);
  const [mostrandoMaterial, setMostrandoMaterial] = useState(false);

  const vencimiento = calcularEstadoVencimiento(tarea, ahora);
  const fecha = formatearFechaLimite(tarea.fechaLimite);
  const idMaterial = `material-${tarea.id}`;

  return (
    <article className={`hoja tarjeta nivel-${vencimiento.nivel}`}>
      <header className="tarjeta-cabecera">
        <div className="tarjeta-principal">
          <h3 className="tarjeta-titulo">{tarea.titulo}</h3>
          <p className="tarjeta-datos">
            <span className="materia">{tarea.materia}</span>
            <span>Entrega: {fecha || "sin fecha"}</span>
          </p>
        </div>
        <div className="tarjeta-situacion">
          <p className="situacion">{describirVencimiento(vencimiento)}</p>
          <p className={`prioridad prioridad-${tarea.prioridad.toLowerCase()}`}>
            Prioridad {tarea.prioridad.toLowerCase()}
          </p>
        </div>
      </header>

      {tarea.descripcion && <p className="descripcion">{tarea.descripcion}</p>}

      <div className="tarjeta-estado">
        <label className="etiqueta-inline">
          Estado
          <select
            value={tarea.estado}
            onChange={(e) => {
              const nuevo = ESTADOS.find((estado) => estado === e.target.value);
              if (nuevo) {
                onCambiarEstado(tarea.id, nuevo);
              }
            }}
          >
            {ESTADOS.map((estado) => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </select>
        </label>
        {tarea.nota !== null && <p className="nota">Nota: {formatearNota(tarea.nota)}</p>}
      </div>

      <div className="acciones acciones-tarjeta">
        <button type="button" className="boton boton-chico" onClick={() => onEditar(tarea.id)}>
          Editar
        </button>
        <button
          type="button"
          className="boton boton-chico"
          aria-expanded={mostrandoMaterial}
          aria-controls={idMaterial}
          onClick={() => setMostrandoMaterial((abierto) => !abierto)}
        >
          Material de estudio ({tarea.materialEstudio.length})
        </button>
        <button type="button" className="boton boton-chico" onClick={() => onAlternarOculta(tarea.id)}>
          {tarea.oculta ? "Mostrar" : "Ocultar"}
        </button>

        {confirmandoEliminar ? (
          <span className="confirmacion" role="group" aria-label="Confirmar eliminación">
            <span>¿Eliminar esta tarea?</span>
            <button type="button" className="boton boton-chico boton-peligro" onClick={() => onEliminar(tarea.id)}>
              Sí, eliminar
            </button>
            <button type="button" className="boton boton-chico" onClick={() => setConfirmandoEliminar(false)}>
              Cancelar
            </button>
          </span>
        ) : (
          <button type="button" className="boton boton-chico boton-texto-peligro" onClick={() => setConfirmandoEliminar(true)}>
            Eliminar
          </button>
        )}
      </div>

      {mostrandoMaterial && (
        <div id={idMaterial}>
          <MaterialPanel
            material={tarea.materialEstudio}
            onAgregar={(material) => onAgregarMaterial(tarea.id, material)}
            onQuitar={(materialId) => onQuitarMaterial(tarea.id, materialId)}
          />
        </div>
      )}
    </article>
  );
}
