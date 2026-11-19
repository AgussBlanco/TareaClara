import { useId, useState, type FormEvent } from "react";
import { esUrlHttp, validarMaterial, type Errores } from "../lib/validaciones";
import type { MaterialEstudio } from "../types";
import { Campo, propsDeError } from "./Campo";

interface Props {
  material: MaterialEstudio[];
  onAgregar: (material: Omit<MaterialEstudio, "id">) => void;
  onQuitar: (materialId: string) => void;
}

export function MaterialPanel({ material, onAgregar, onQuitar }: Props) {
  const uid = useId();
  const [tipo, setTipo] = useState("link");
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [errores, setErrores] = useState<Errores>({});

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const resultado = validarMaterial({ titulo, tipo, contenido });
    if (!resultado.ok) {
      setErrores(resultado.errores);
      return;
    }
    onAgregar(resultado.datos);
    setTitulo("");
    setContenido("");
    setErrores({});
  }

  const id = (campo: string) => `${uid}-${campo}`;

  return (
    <div className="material">
      {material.length === 0 ? (
        <p className="vacio-chico">Esta tarea todavía no tiene material de estudio.</p>
      ) : (
        <ul className="material-lista">
          {material.map((item) => (
            <li key={item.id}>
              <div className="material-item">
                {item.tipo === "link" && esUrlHttp(item.contenido) ? (
                  <a href={item.contenido} target="_blank" rel="noopener noreferrer">
                    {item.titulo}
                  </a>
                ) : (
                  <strong>{item.titulo}</strong>
                )}
                {item.tipo === "texto" && <p className="material-texto">{item.contenido}</p>}
              </div>
              <button
                type="button"
                className="boton-texto"
                onClick={() => onQuitar(item.id)}
                aria-label={`Quitar el material ${item.titulo}`}
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}

      <form className="material-formulario" onSubmit={enviar} noValidate aria-label="Agregar material de estudio">
        <div className="fila-campos">
          <Campo id={id("tipo")} etiqueta="Tipo" error={errores.tipo}>
            <select {...propsDeError(id("tipo"), errores.tipo)} value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="link">Enlace</option>
              <option value="texto">Apunte</option>
            </select>
          </Campo>
          <Campo id={id("titulo")} etiqueta="Título" error={errores.titulo}>
            <input
              {...propsDeError(id("titulo"), errores.titulo)}
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </Campo>
        </div>
        <Campo
          id={id("contenido")}
          etiqueta={tipo === "link" ? "Enlace" : "Apunte"}
          error={errores.contenido}
        >
          {tipo === "link" ? (
            <input
              {...propsDeError(id("contenido"), errores.contenido)}
              type="url"
              placeholder="https://"
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
            />
          ) : (
            <textarea
              {...propsDeError(id("contenido"), errores.contenido)}
              rows={3}
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
            />
          )}
        </Campo>
        <button type="submit" className="boton">
          Agregar material
        </button>
      </form>
    </div>
  );
}
