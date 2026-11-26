// Ilustraciones de línea para los cuatro paneles de la escena 5. Mismo trazo que el hilo de río:
// líneas finas, terminaciones redondas, oro sobre la escena oscura.
const base = {
  viewBox: '0 0 64 64',
  width: 56,
  height: 56,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
};

export function IlusComunidad() {
  return (
    <svg {...base}>
      <path d="M32 8c-7 0-12 5.2-12 11.6C20 28 32 38 32 38s12-10 12-18.4C44 13.2 39 8 32 8Z" />
      <circle cx="32" cy="19.5" r="4" />
      <path d="M10 46l6-5 6 5v8H10z M38 46l6-5 6 5v8H38z" opacity=".75" />
      <path d="M4 58c8-3 14 2 22-1s14-3 20 0 10 2 14 1" stroke="var(--rio-claro)" />
    </svg>
  );
}

export function IlusLaboratorio() {
  return (
    <svg {...base}>
      <circle cx="30" cy="36" r="16" />
      <path d="M14 36h32M30 20c-5 5-5 27 0 32M30 20c5 5 5 27 0 32" opacity=".6" />
      <path d="M24 33l5-3 4 4-3 5-5-1z" fill="currentColor" stroke="none" opacity=".9" />
      <ellipse cx="32" cy="34" rx="27" ry="9" transform="rotate(-24 32 34)" opacity=".45" />
      <rect x="49" y="9" width="7" height="5" rx="1" transform="rotate(-24 52 11)" />
      <path d="M46 13l-4 2M58 6l3-1" />
    </svg>
  );
}

export function IlusConocimiento() {
  return (
    <svg {...base}>
      <rect x="14" y="10" width="30" height="40" rx="5" transform="rotate(-8 29 30)" opacity=".55" />
      <rect x="20" y="12" width="30" height="40" rx="5" />
      <path d="M35 44c0-9 3-15 9-19-1 8-4 14-9 19Zm0 0c-1-6-4-9-8-10 0 5 3 8 8 10Z" stroke="var(--selva-claro)" />
      <path d="M26 22h16M26 28h10" opacity=".7" />
    </svg>
  );
}

export function IlusRecursos() {
  return (
    <svg {...base}>
      <path d="M32 12s-12 14-12 23a12 12 0 0 0 24 0c0-9-12-23-12-23Z" stroke="var(--rio-claro)" />
      <path d="M32 44V30m0 6c0-5 4-8 8-8 0 5-4 8-8 8Zm0-3c-1-4-4-6-7-6 0 4 3 6 7 6Z" stroke="var(--selva-claro)" />
      <circle cx="14" cy="14" r="2" fill="currentColor" stroke="none" />
      <circle cx="50" cy="18" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="46" cy="8" r="1" fill="currentColor" stroke="none" />
      <path d="M8 56c8-3 14 2 24-1s16-2 24 1" opacity=".6" />
    </svg>
  );
}
