import type { ReactNode } from 'react';
import type { Ilus } from '@/data/cartas';

/**
 * Ilustraciones de línea de Infórmate: trazo verde tinta, acentos dorados, agua azul grisácea y una
 * mancha marfil detrás. Un solo lenguaje para las 33 cartas (y reutilizable en Donaciones).
 * viewBox 200 × 140.
 */
const T = '#3e5a40'; // tinta verde
const O = '#c7a354'; // oro
const A = '#6f9fb3'; // agua
const P = '#9aa4aa'; // mercurio
const F = '#e7dfc6'; // mancha de fondo

const motivos: Record<Ilus, ReactNode> = {
  pepitas: (
    <>
      <path d="M62 92 l14-22 h30 l14 22 z" fill={O} opacity=".9" />
      <path d="M76 70 h30 l-3-6 h-24 z" fill="#e3c57e" />
      <path d="M118 96 q8-10 18-4 q6 8-4 14 q-12 4-14-10z" fill={O} />
      <path d="M134 78 q6-6 12 0 q2 8-6 9 q-8-1-6-9z" fill="#e3c57e" />
      <path d="M50 104 h100" stroke={T} />
    </>
  ),
  gotas: (
    <>
      <path d="M100 36 q-22 30-22 46 a22 22 0 0 0 44 0 q0-16-22-46z" fill={P} opacity=".85" />
      <path d="M92 78 q2-10 8-16" stroke="#fff" opacity=".8" />
      <circle cx="136" cy="94" r="9" fill={P} />
      <circle cx="62" cy="98" r="6" fill={P} />
      <circle cx="150" cy="74" r="4" fill={P} />
    </>
  ),
  origen: (
    <>
      <path d="M40 104 l30-44 20 22 18-30 52 52z" fill="#d9d1b5" stroke={T} />
      <path d="M58 104 l12-16 h16 l8 16" fill={O} />
      <path d="M126 46 a10 10 0 1 0 0.1 0" fill="none" stroke={O} />
      <path d="M140 60 l10 10" stroke={O} />
    </>
  ),
  rio: (
    <>
      <path d="M30 70 q30-26 60-6 t60 0 t30-8" stroke={T} />
      <path d="M20 108 q40-30 70-14 t60 2 t40-10" stroke={A} strokeWidth="9" opacity=".75" />
      <circle cx="96" cy="96" r="3" fill={P} />
      <circle cx="120" cy="100" r="2.5" fill={P} />
      <circle cx="140" cy="96" r="2" fill={P} />
    </>
  ),
  vapor: (
    <>
      <path d="M64 104 h72 l-8 14 h-56z" fill="#cfc6aa" stroke={T} />
      <path d="M80 92 q-8-12 0-22 t0-22" stroke={P} />
      <path d="M100 92 q-8-12 0-22 t0-22" stroke={P} />
      <path d="M120 92 q-8-12 0-22 t0-22" stroke={P} />
    </>
  ),
  pez: (
    <>
      <path d="M56 76 q34-30 74 0 q-40 30-74 0z" fill={A} opacity=".35" stroke={T} />
      <path d="M130 76 l20-14 v28z" fill={A} opacity=".35" stroke={T} />
      <circle cx="72" cy="72" r="3" fill={T} />
      <circle cx="98" cy="80" r="2.5" fill={P} />
      <circle cx="108" cy="72" r="2" fill={P} />
    </>
  ),
  plato: (
    <>
      <ellipse cx="100" cy="96" rx="58" ry="14" fill="#fff" stroke={T} />
      <path d="M70 90 q24-20 50 0 q-26 14-50 0z" fill={A} opacity=".4" stroke={T} />
      <path d="M120 90 l12-8 v16z" fill={A} opacity=".4" stroke={T} />
      <path d="M100 40 v22 M92 52 l8 10 8-10" stroke={O} />
    </>
  ),
  vaso: (
    <>
      <path d="M78 40 h44 l-6 72 h-32z" fill={A} opacity=".18" stroke={T} />
      <path d="M82 60 h36" stroke={A} />
      <circle cx="96" cy="84" r="2" fill={P} />
      <circle cx="106" cy="96" r="1.6" fill={P} />
      <path d="M140 52 q-8 10 0 16 q8-6 0-16z" fill={A} opacity=".6" />
    </>
  ),
  olla: (
    <>
      <path d="M58 76 h84 v24 q0 14-14 14 h-56 q-14 0-14-14z" fill="#d9d1b5" stroke={T} />
      <path d="M52 76 h96" stroke={T} />
      <path d="M84 64 q-6-8 0-16 M100 64 q-6-8 0-16 M116 64 q-6-8 0-16" stroke={P} />
      <circle cx="100" cy="96" r="4" fill={P} />
    </>
  ),
  frasco: (
    <>
      <path d="M88 34 h24 M92 34 v30 l-26 44 q-4 8 6 8 h56 q10 0 6-8 l-26-44 v-30" fill="none" stroke={T} />
      <path d="M74 98 q26-10 52 0 l4 8 q0 4-6 4 h-48 q-6 0-6-4z" fill={A} opacity=".5" />
      <circle cx="98" cy="90" r="3" fill={O} />
      <circle cx="110" cy="82" r="2" fill={O} />
    </>
  ),
  alerta: (
    <>
      <path d="M100 32 l46 80 h-92z" fill="#f1e2c2" stroke={O} />
      <path d="M100 58 v26" stroke={T} strokeWidth="4" />
      <circle cx="100" cy="96" r="3" fill={T} />
    </>
  ),
  persona: (
    <>
      <circle cx="100" cy="46" r="14" fill="#d9d1b5" stroke={T} />
      <path d="M72 116 q4-46 28-46 t28 46" fill="#d9d1b5" stroke={T} />
      <path d="M140 54 q-8-8 0-16 M150 58 q-6-6 0-12" stroke={P} />
      <path d="M58 92 h14" stroke={O} />
    </>
  ),
  cerebro: (
    <>
      <path d="M70 80 q-10-30 22-34 q12-12 26 0 q28 6 16 34 q-2 18-26 18 h-14 q-22 0-24-18z" fill="#eadfcb" stroke={T} />
      <path d="M90 56 q8 8 0 16 M110 54 q-6 10 4 18 M100 76 v12" stroke={T} />
      <path d="M100 98 v18" stroke={T} />
    </>
  ),
  madre: (
    <>
      <circle cx="92" cy="42" r="12" fill="#d9d1b5" stroke={T} />
      <path d="M74 116 q0-40 18-58 q22 6 24 30 q14 8 6 28" fill="#d9d1b5" stroke={T} />
      <path d="M128 70 q8 0 8 8 q0 10-14 18 q-14-8-14-18 q0-8 8-8 q4 0 6 4 q2-4 6-4z" fill={O} opacity=".85" />
    </>
  ),
  manos: (
    <>
      <path d="M44 100 q20-4 36 6 h30 q8 0 8-7 h-26" fill="none" stroke={T} />
      <path d="M156 100 q-20-4-36 6" fill="none" stroke={T} />
      <path d="M100 44 q-16 20-16 30 a16 16 0 0 0 32 0 q0-10-16-30z" fill={A} opacity=".55" />
    </>
  ),
  casco: (
    <>
      <path d="M62 92 q0-40 38-40 t38 40z" fill={O} opacity=".9" stroke={T} />
      <path d="M54 92 h92 v8 h-92z" fill="#e3c57e" stroke={T} />
      <path d="M100 52 v-8" stroke={T} />
      <path d="M78 112 h44" stroke={T} />
    </>
  ),
  bosque: (
    <>
      <path d="M50 112 v-20 M50 92 q-16-4-10-20 q10-14 20 0 q6 16-10 20z" fill="#b8c9a2" stroke={T} />
      <path d="M100 112 v-34 M100 78 q-24-6-14-30 q14-20 28 0 q10 24-14 30z" fill="#9db68a" stroke={T} />
      <path d="M150 112 v-24 M150 88 q-18-4-12-22 q12-16 24 0 q6 18-12 22z" fill="#b8c9a2" stroke={T} />
      <path d="M36 112 q60 10 128 0" stroke={A} />
    </>
  ),
  sedimento: (
    <>
      <path d="M40 54 q60-14 120 0" stroke={A} />
      <path d="M40 78 q60 8 120-4 v42 h-120z" fill="#d5c39c" opacity=".8" />
      <path d="M48 92 h20 M80 100 h14 M110 94 h22 M60 108 h30" stroke={T} />
      <circle cx="120" cy="104" r="2.5" fill={P} />
      <circle cx="84" cy="88" r="2" fill={P} />
    </>
  ),
  mesa: (
    <>
      <path d="M44 62 l112 22 v10 l-112-22z" fill="#d9d1b5" stroke={T} />
      <path d="M58 70 q50 4 90 18" stroke={A} />
      <path d="M60 74 v38 M140 92 v20" stroke={T} />
      <circle cx="120" cy="84" r="3" fill={O} />
      <circle cx="132" cy="88" r="2.5" fill={O} />
    </>
  ),
  documento: (
    <>
      <path d="M70 30 h48 l16 16 v68 h-64z" fill="#fff" stroke={T} />
      <path d="M82 56 h40 M82 68 h40 M82 80 h28" stroke={T} />
      <circle cx="116" cy="98" r="11" fill={O} opacity=".9" />
      <path d="M110 108 l-4 12 10-6 10 6 -4-12" fill={O} />
    </>
  ),
  casas: (
    <>
      <path d="M46 112 v-26 l20-16 20 16 v26z" fill="#d9d1b5" stroke={T} />
      <path d="M96 112 v-34 l24-18 24 18 v34z" fill="#e3d6b7" stroke={T} />
      <path d="M114 112 v-14 h12 v14" stroke={T} />
      <path d="M150 46 q-6 0-6 6 q0 6 6 10 q6-4 6-10 q0-6-6-6z" fill={O} />
    </>
  ),
  balanza: (
    <>
      <path d="M100 34 v74 M70 112 h60 M58 50 h84" stroke={T} />
      <path d="M58 50 l-16 30 h32z" fill={A} opacity=".35" stroke={T} />
      <path d="M142 50 l-16 30 h32z" fill={O} opacity=".35" stroke={T} />
    </>
  ),
  satelite: (
    <>
      <path d="M40 116 a70 70 0 0 1 120 0" fill="#c9d8cf" stroke={T} />
      <rect x="92" y="34" width="16" height="16" rx="3" fill={O} stroke={T} />
      <path d="M70 38 h20 M110 38 h20" stroke={A} strokeWidth="6" />
      <path d="M100 52 l-18 40 M100 52 l18 40" stroke={O} strokeDasharray="3 5" />
    </>
  ),
  celular: (
    <>
      <rect x="76" y="26" width="48" height="92" rx="9" fill="#fff" stroke={T} />
      <rect x="86" y="44" width="28" height="28" fill="none" stroke={T} />
      <path d="M90 48 h6 v6 h-6z M104 48 h6 v6 h-6z M90 62 h6 v6 h-6z M104 60 h4 M100 66 h8" stroke={T} />
      <path d="M140 60 q10 10 0 20 M150 54 q16 16 0 32" stroke={O} />
    </>
  ),
  brote: (
    <>
      <path d="M100 112 v-40" stroke={T} />
      <path d="M100 82 q-30-4-30-28 q26 0 30 28z" fill="#9db68a" stroke={T} />
      <path d="M100 74 q24-2 26-24 q-22 0-26 24z" fill="#b8c9a2" stroke={T} />
      <circle cx="70" cy="104" r="9" fill={O} />
      <path d="M134 98 q-8 10 0 14 q8-4 0-14z" fill={A} />
    </>
  ),
};

export function Ilustracion({ ilus }: { ilus: Ilus }) {
  return (
    <svg viewBox="0 0 200 140" className="ilus" aria-hidden="true" focusable="false">
      <path d="M26 82 q4-48 70-56 q72-6 82 46 q6 46-74 50 q-80 4-78-40z" fill={F} />
      <g fill="none" stroke={T} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {motivos[ilus]}
      </g>
    </svg>
  );
}
