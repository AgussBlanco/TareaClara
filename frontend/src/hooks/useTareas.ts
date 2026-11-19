import { useCallback, useRef, useState } from "react";
import {
  agregarMaterial,
  alternarOculta,
  cambiarEstado,
  crearTarea,
  editarTarea,
  quitarMaterial,
} from "../lib/tareas";
import { mensajeDeError } from "../lib/utilidades";
import { storage } from "../storage/storage";
import type { DatosTarea, EstadoTarea, MaterialEstudio, Tarea } from "../types";

/** Estado de las tareas del usuario: aplica las reglas de lib/tareas y guarda con storage. */
export function useTareas(usuarioId: string) {
  const [tareas, setTareas] = useState<Tarea[]>(() => storage.leerTareasDeUsuario(usuarioId));
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  const actuales = useRef<Tarea[]>(tareas);

  const aplicar = useCallback(
    (transformar: (previas: Tarea[]) => Tarea[]) => {
      const siguientes = transformar(actuales.current);
      actuales.current = siguientes;
      setTareas(siguientes);
      try {
        storage.guardarTareasDeUsuario(usuarioId, siguientes);
        setErrorGuardado(null);
      } catch (error) {
        setErrorGuardado(mensajeDeError(error));
      }
    },
    [usuarioId]
  );

  const modificar = useCallback(
    (id: string, cambio: (tarea: Tarea) => Tarea) => {
      aplicar((previas) => previas.map((t) => (t.id === id ? cambio(t) : t)));
    },
    [aplicar]
  );

  return {
    tareas,
    errorGuardado,
    crear: (datos: DatosTarea) => aplicar((previas) => [...previas, crearTarea(usuarioId, datos)]),
    editar: (id: string, datos: DatosTarea) => modificar(id, (t) => editarTarea(t, datos)),
    cambiarEstado: (id: string, estado: EstadoTarea) => modificar(id, (t) => cambiarEstado(t, estado)),
    alternarOculta: (id: string) => modificar(id, alternarOculta),
    eliminar: (id: string) => aplicar((previas) => previas.filter((t) => t.id !== id)),
    agregarMaterial: (id: string, material: Omit<MaterialEstudio, "id">) =>
      modificar(id, (t) => agregarMaterial(t, material)),
    quitarMaterial: (id: string, materialId: string) =>
      modificar(id, (t) => quitarMaterial(t, materialId)),
  };
}
