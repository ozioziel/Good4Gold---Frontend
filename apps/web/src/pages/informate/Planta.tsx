/**
 * Planta dibujada en el borde inferior: el tallo (el hilo de río, ahora verde) crece con las cartas
 * recorridas y las hojas se abren por tramos. Decorativa: detrás del contenido, nunca tapa controles.
 * Con movimiento reducido aparece en su estado, sin transición.
 */
const HOJAS = [
  { t: 0.08, d: 'M58 210 q-34-6-40-34 q30 0 40 34z' },
  { t: 0.2, d: 'M74 176 q30-12 50 4 q-28 18-50-4z' },
  { t: 0.34, d: 'M84 140 q-36-2-46-30 q34-2 46 30z' },
  { t: 0.48, d: 'M104 112 q28-18 52-6 q-24 22-52 6z' },
  { t: 0.62, d: 'M112 80 q-30-8-34-36 q28 4 34 36z' },
  { t: 0.76, d: 'M134 58 q26-20 50-12 q-20 24-50 12z' },
  { t: 0.9, d: 'M140 30 q-14-24 0-40 q14 16 0 40z' },
];

export function Planta({ progreso }: { progreso: number }) {
  const p = Math.max(0.04, Math.min(1, progreso));
  return (
    <svg className="planta" viewBox="0 0 220 260" aria-hidden="true" focusable="false">
      <path className="planta__tallo" d="M40 258 q6-44 24-74 t26-70 t30-60 t22-48" pathLength={1} style={{ strokeDashoffset: 1 - p }} />
      {HOJAS.map((h) => (
        <path key={h.t} className={'planta__hoja' + (p >= h.t ? ' is-abierta' : '')} d={h.d} />
      ))}
      <circle className={'planta__flor' + (p >= 0.99 ? ' is-abierta' : '')} cx="142" cy="10" r="7" />
    </svg>
  );
}
