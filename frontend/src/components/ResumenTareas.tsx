import type { Resumen } from "../lib/resumen";

interface Props {
  resumen: Resumen;
}

export function ResumenTareas({ resumen }: Props) {
  const datos = [
    { clave: "pendientes", valor: resumen.pendientes, etiqueta: "Pendientes" },
    { clave: "vencidas", valor: resumen.vencidas, etiqueta: "Vencidas" },
    { clave: "proximas", valor: resumen.proximas, etiqueta: "Vencen en 3 días o menos" },
    { clave: "completadas", valor: resumen.completadas, etiqueta: "Completadas" },
  ];

  return (
    <dl className="resumen" aria-label="Resumen de tareas">
      {datos.map(({ clave, valor, etiqueta }) => (
        <div key={clave} className={`resumen-dato resumen-${clave}${valor > 0 ? " con-valor" : ""}`}>
          <dd>{valor}</dd>
          <dt>{etiqueta}</dt>
        </div>
      ))}
    </dl>
  );
}
