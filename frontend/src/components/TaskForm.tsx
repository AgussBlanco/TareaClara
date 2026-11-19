import { useId, useState, type FormEvent } from "react";
import {
  LIMITES,
  validarBorradorTarea,
  type BorradorTarea,
  type Errores,
} from "../lib/validaciones";
import { PRIORIDADES, type DatosTarea, type Tarea } from "../types";
import { Campo, propsDeError } from "./Campo";

interface Props {
  inicial?: Tarea;
  materias: string[];
  onGuardar: (datos: DatosTarea) => void;
  onCancelar: () => void;
}

function borradorInicial(tarea?: Tarea): BorradorTarea {
  if (!tarea) {
    return { titulo: "", descripcion: "", materia: "", fechaLimite: "", prioridad: "Media", nota: "" };
  }
  return {
    titulo: tarea.titulo,
    descripcion: tarea.descripcion,
    materia: tarea.materia,
    fechaLimite: tarea.fechaLimite,
    prioridad: tarea.prioridad,
    nota: tarea.nota === null ? "" : String(tarea.nota),
  };
}

export function TaskForm({ inicial, materias, onGuardar, onCancelar }: Props) {
  const uid = useId();
  const [borrador, setBorrador] = useState<BorradorTarea>(() => borradorInicial(inicial));
  const [errores, setErrores] = useState<Errores>({});
  const editando = inicial !== undefined;

  function cambiar<K extends keyof BorradorTarea>(campo: K, valor: BorradorTarea[K]) {
    setBorrador((previo) => ({ ...previo, [campo]: valor }));
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const resultado = validarBorradorTarea(borrador);
    if (!resultado.ok) {
      setErrores(resultado.errores);
      return;
    }
    setErrores({});
    onGuardar(resultado.datos);
  }

  const id = (campo: string) => `${uid}-${campo}`;

  return (
    <form className="hoja formulario" onSubmit={enviar} noValidate aria-label={editando ? "Editar tarea" : "Nueva tarea"}>
      <h2 className="formulario-titulo">{editando ? "Editar tarea" : "Nueva tarea"}</h2>

      <Campo id={id("titulo")} etiqueta="Título" error={errores.titulo}>
        <input
          {...propsDeError(id("titulo"), errores.titulo)}
          type="text"
          maxLength={LIMITES.tituloMax + 20}
          value={borrador.titulo}
          onChange={(e) => cambiar("titulo", e.target.value)}
        />
      </Campo>

      <div className="fila-campos">
        <Campo id={id("materia")} etiqueta="Materia" error={errores.materia}>
          <input
            {...propsDeError(id("materia"), errores.materia)}
            type="text"
            list={id("materias")}
            value={borrador.materia}
            onChange={(e) => cambiar("materia", e.target.value)}
          />
          <datalist id={id("materias")}>
            {materias.map((materia) => (
              <option key={materia} value={materia} />
            ))}
          </datalist>
        </Campo>

        <Campo id={id("fecha")} etiqueta="Fecha límite" error={errores.fechaLimite}>
          <input
            {...propsDeError(id("fecha"), errores.fechaLimite)}
            type="date"
            value={borrador.fechaLimite}
            onChange={(e) => cambiar("fechaLimite", e.target.value)}
          />
        </Campo>

        <Campo id={id("prioridad")} etiqueta="Prioridad" error={errores.prioridad}>
          <select
            {...propsDeError(id("prioridad"), errores.prioridad)}
            value={borrador.prioridad}
            onChange={(e) => cambiar("prioridad", e.target.value)}
          >
            {PRIORIDADES.map((prioridad) => (
              <option key={prioridad} value={prioridad}>
                {prioridad}
              </option>
            ))}
          </select>
        </Campo>

        <Campo id={id("nota")} etiqueta="Nota (opcional)" error={errores.nota} ayuda="De 0 a 10.">
          <input
            {...propsDeError(id("nota"), errores.nota)}
            type="text"
            inputMode="decimal"
            value={borrador.nota}
            onChange={(e) => cambiar("nota", e.target.value)}
          />
        </Campo>
      </div>

      <Campo id={id("descripcion")} etiqueta="Descripción (opcional)" error={errores.descripcion}>
        <textarea
          {...propsDeError(id("descripcion"), errores.descripcion)}
          rows={3}
          value={borrador.descripcion}
          onChange={(e) => cambiar("descripcion", e.target.value)}
        />
      </Campo>

      <div className="acciones">
        <button type="submit" className="boton boton-principal">
          {editando ? "Guardar cambios" : "Crear tarea"}
        </button>
        <button type="button" className="boton" onClick={onCancelar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
