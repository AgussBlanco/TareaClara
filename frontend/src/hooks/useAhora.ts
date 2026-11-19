import { useEffect, useState } from "react";

/** Fecha y hora actuales, renovadas cada tanto para que "vence hoy" cambie solo a medianoche. */
export function useAhora(intervaloMs = 60_000): Date {
  const [ahora, setAhora] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setAhora(new Date()), intervaloMs);
    return () => window.clearInterval(id);
  }, [intervaloMs]);

  return ahora;
}
