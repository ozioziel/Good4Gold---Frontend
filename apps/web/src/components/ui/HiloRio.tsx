// Firma visual del proyecto: el «hilo de río dorado». Marca dónde estás (pestaña activa) y vuelve a aparecer
// como río en el Inicio, tallo en Infórmate y río de transparencia en Donaciones.
// Se dibuja al montar (orientación: «llegaste aquí»); con movimiento reducido aparece ya dibujado.
interface Props {
  ancho?: number;
  className?: string;
}

export function HiloRio({ ancho = 44, className }: Props) {
  const alto = 8;
  const d = `M1 ${alto / 2} C ${ancho * 0.18} 0.5, ${ancho * 0.32} ${alto - 0.5}, ${ancho / 2} ${alto / 2} S ${ancho * 0.82} 0.5, ${ancho - 1} ${alto / 2}`;
  return (
    <svg
      className={['hilo-rio', className].filter(Boolean).join(' ')}
      width={ancho}
      height={alto}
      viewBox={`0 0 ${ancho} ${alto}`}
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} pathLength={1} />
    </svg>
  );
}
