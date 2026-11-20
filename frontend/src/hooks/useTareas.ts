import { useCallback, useEffect, useState } from "react";
import type { Api } from "../lib/api";
import { quitarTarea, reemplazarTarea } from "../lib/tareas";
import { mensajeDeError } from "../lib/utilidades";
import type { DatosTarea, EstadoTarea, MaterialEstudio, Tarea } from "../types";

/**
 * Tareas del usuario guardadas en el servidor. No hay cambios "optimistas": la lista se actualiza
 * con lo que el servidor responde, así la pantalla nunca muestra algo que no se guardó.
 * Cada acción devuelve true si salió bien, para que el formulario sepa si puede cerrarse.
 */
export function useTareas(api: Api) {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendientes, setPendientes] = useState(0);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setTareas(await api.listarTareas());
      setError(null);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }, [api]);

  useEffect(() => {
    let vigente = true;
    api
      .listarTareas()
      .then((lista) => {
        if (vigente) setTareas(lista);
      })
      .catch((e: unknown) => {
        if (vigente) setError(mensajeDeError(e));
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [api]);

  const ejecutar = useCallback(
    async (accion: () => Promise<void>): Promise<boolean> => {
      setError(null);
      setPendientes((n) => n + 1);
      try {
        await accion();
        return true;
      } catch (e) {
        setError(mensajeDeError(e));
        return false;
      } finally {
        setPendientes((n) => n - 1);
      }
    },
    []
  );

  const reemplazando = useCallback(
    (pedir: () => Promise<Tarea>) =>
      ejecutar(async () => {
        const nueva = await pedir();
        setTareas((previas) => reemplazarTarea(previas, nueva));
      }),
    [ejecutar]
  );

  return {
    tareas,
    cargando,
    error,
    guardando: pendientes > 0,
    recargar: cargar,
    crear: (datos: DatosTarea) =>
      ejecutar(async () => {
        const nueva = await api.crearTarea(datos);
        setTareas((previas) => [...previas, nueva]);
      }),
    editar: (id: string, datos: DatosTarea) => reemplazando(() => api.editarTarea(id, datos)),
    cambiarEstado: (id: string, estado: EstadoTarea) => reemplazando(() => api.cambiarEstado(id, estado)),
    cambiarOculta: (id: string, oculta: boolean) => reemplazando(() => api.cambiarOculta(id, oculta)),
    eliminar: (id: string) =>
      ejecutar(async () => {
        await api.eliminarTarea(id);
        setTareas((previas) => quitarTarea(previas, id));
      }),
    agregarMaterial: (id: string, material: Omit<MaterialEstudio, "id">) =>
      reemplazando(() => api.agregarMaterial(id, material)),
    quitarMaterial: (id: string, materialId: string) => reemplazando(() => api.quitarMaterial(id, materialId)),
  };
}
