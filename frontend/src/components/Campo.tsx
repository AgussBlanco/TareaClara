import type { ReactNode } from "react";

interface CampoProps {
  id: string;
  etiqueta: string;
  error?: string;
  ayuda?: string;
  children: ReactNode;
}

/** Atributos de accesibilidad para un input que puede tener un error asociado. */
export function propsDeError(id: string, error: string | undefined) {
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : undefined,
  };
}

export function Campo({ id, etiqueta, error, ayuda, children }: CampoProps) {
  return (
    <div className="campo">
      <label htmlFor={id}>{etiqueta}</label>
      {children}
      {ayuda && !error && <p className="ayuda-campo">{ayuda}</p>}
      {error && (
        <p className="error-campo" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
