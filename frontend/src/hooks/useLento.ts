import { useEffect, useState } from "react";

/** true cuando "activo" lleva más de "retrasoMs" seguido: sirve para avisar que el servidor gratuito está despertando. */
export function useLento(activo: boolean, retrasoMs = 4000): boolean {
  const [lento, setLento] = useState(false);

  useEffect(() => {
    if (!activo) {
      setLento(false);
      return;
    }
    const id = window.setTimeout(() => setLento(true), retrasoMs);
    return () => window.clearTimeout(id);
  }, [activo, retrasoMs]);

  return lento;
}
