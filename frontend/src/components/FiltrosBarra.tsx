import {
  esEstadoFiltro,
  esPrioridadFiltro,
  hayFiltrosActivos,
  FILTROS_INICIALES,
  type Filtros,
} from "../lib/filtros";
import { ESTADOS, PRIORIDADES } from "../types";

interface Props {
  filtros: Filtros;
  materias: string[];
  onCambiar: (filtros: Filtros) => void;
}

export function FiltrosBarra({ filtros, materias, onCambiar }: Props) {
  return (
    <form className="filtros" role="search" aria-label="Filtrar tareas" onSubmit={(e) => e.preventDefault()}>
      <label className="filtro filtro-busqueda">
        Buscar por título
        <input
          type="search"
          value={filtros.busqueda}
          onChange={(e) => onCambiar({ ...filtros, busqueda: e.target.value })}
        />
      </label>

      <label className="filtro">
        Estado
        <select
          value={filtros.estado}
          onChange={(e) => {
            if (esEstadoFiltro(e.target.value)) {
              onCambiar({ ...filtros, estado: e.target.value });
            }
          }}
        >
          <option value="Todos">Todos</option>
          {ESTADOS.map((estado) => (
            <option key={estado} value={estado}>
              {estado}
            </option>
          ))}
        </select>
      </label>

      <label className="filtro">
        Prioridad
        <select
          value={filtros.prioridad}
          onChange={(e) => {
            if (esPrioridadFiltro(e.target.value)) {
              onCambiar({ ...filtros, prioridad: e.target.value });
            }
          }}
        >
          <option value="Todas">Todas</option>
          {PRIORIDADES.map((prioridad) => (
            <option key={prioridad} value={prioridad}>
              {prioridad}
            </option>
          ))}
        </select>
      </label>

      <label className="filtro">
        Materia
        <select value={filtros.materia} onChange={(e) => onCambiar({ ...filtros, materia: e.target.value })}>
          <option value="">Todas</option>
          {materias.map((materia) => (
            <option key={materia} value={materia}>
              {materia}
            </option>
          ))}
        </select>
      </label>

      {hayFiltrosActivos(filtros) && (
        <button type="button" className="boton boton-chico filtro-limpiar" onClick={() => onCambiar(FILTROS_INICIALES)}>
          Quitar filtros
        </button>
      )}
    </form>
  );
}
